"use server";

import { auth } from "@clerk/nextjs/server";
import { writeClient } from "@/sanity/lib/writeClient";
import { client } from "@/sanity/lib/client";
import {
  USER_WITH_TOKENS_QUERY,
  type ConnectedAccountWithTokens,
} from "@/sanity/queries/user";
import { BOOKING_WITH_HOST_CALENDAR_QUERY } from "@/sanity/queries/bookings";
import {
  //   getCalendarClient,
  revokeGoogleToken,
  //   getEventAttendeeStatuses,
  fetchCalendarEvents,
  AttendeeStatus,
  getEventAttendeeStatus,
  getCalendarClient,
  //   type AttendeeStatus,
} from "@/lib/google-calendar";

/**
 * TYPES
 */

export type BusySlot = {
  start: string;
  end: string;
  accountEmail: string;
  title: string;
};

export type BookingStatuses = {
  guestStatus: AttendeeStatus;
  isCancelled: boolean;
};

/**
 * Host Actions (Authenticated)
 * Get the count of connected calendar accounts for the current user
 */

export async function getUserConnectedAccountsCount(): Promise<number> {
  const { userId } = await auth();
  if (!userId) return 0;

  const user = await client.fetch(USER_WITH_TOKENS_QUERY, { clerkId: userId });
  return user?.connectedAccounts?.length ?? 0;
}

/**
 * Fetch busy times from all connected Google Calendars
 */
export async function getGoogleBusyTimes(startDate: Date, endDate: Date) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await client.fetch(USER_WITH_TOKENS_QUERY, { clerkId: userId });

  if (!user?.connectedAccounts?.length) {
    return [];
  }

  const events = await fetchCalendarEvents(
    user.connectedAccounts,
    startDate,
    endDate,
  );
  return events.map((event) => ({
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    accountEmail: event.accountEmail,
    title: event.title,
  }));
}

/** Disconnect a Google account */
export async function disconnectGoogleAccount(
  accountKey: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await client.fetch(USER_WITH_TOKENS_QUERY, { clerkId: userId });
  if (!user) throw new Error("User not found");

  // Find the account to disconnect
  const account = user.connectedAccounts?.find((a) => a._key === accountKey);
  if (!account) throw new Error("Account not found");

  // Revoke the token with Google
  if (account.accessToken) {
    await revokeGoogleToken(account.accessToken);
  }

  // Was is the default account?
  const wasDefault = account.isDefault;
  const remainingAccounts = user.connectedAccounts?.filter(
    (a) => a._key !== accountKey,
  );

  // Remove the account from Sanity
  await writeClient
    .patch(user._id)
    .unset([`connectedAccounts[_key=="${accountKey}"]`])
    .commit();

  // Set new default if removed and other accounts remain
  // Set the first remaining account as default

  if (wasDefault && remainingAccounts && remainingAccounts.length > 0) {
    const newDefaultKey = remainingAccounts[0]._key;
    await writeClient
      .patch(user._id)
      .set({
        [`connectedAccounts[_key=="${newDefaultKey}"].isDefault`]: true,
      })
      .commit();
  }
}

/**
 * Set a new default account for new bookings
 */
export async function setDefaultCalendarAccount(
  accountKey: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await client.fetch(USER_WITH_TOKENS_QUERY, { clerkId: userId });
  if (!user) throw new Error("User not found");

  // Verify the account exists
  const account = user.connectedAccounts?.find((a) => a._key === accountKey);

  if (!account) throw new Error("Account not found");

  // Step 1: Patch 1: Unset all accounts to non-default
  // Step 2: Patch 2: Patch the newly account to default
  for (const acc of user.connectedAccounts ?? []) {
    if (acc._key !== accountKey && acc.isDefault) {
      await writeClient
        .patch(user._id)
        .set({
          [`connectedAccounts[_key=="${acc._key}"].isDefault`]: false,
        })
        .commit();
    }
  }

  // Set newly default account
  await writeClient
    .patch(user._id)
    .set({
      [`connectedAccounts[_key=="${accountKey}"].isDefault`]: true,
    })
    .commit();
}

/**
 * Delete a cancelled booking from the Google Calendar event and Sanity document
 * Used for lazy deletion when a booking has been cancelled
 */
async function cleanupCancelledBooking(
  account: ConnectedAccountWithTokens,
  bookingId: string,
  googleEventId: string,
  eventStillExists: boolean,
): Promise<void> {
  // Delete Google Calendar event if it still exists
  if (eventStillExists && account.accessToken && account.refreshToken) {
    try {
      const calendar = await getCalendarClient(account);
      await calendar.events.delete({
        calendarId: "primary",
        eventId: googleEventId,
        sendUpdates: "all",
      });
    } catch (error) {
      console.error("Failed top delete Google Calendar event:", error);
    }
  }

  // Delete booking from Sanity
  try {
    await writeClient.delete(bookingId);
  } catch (error) {
    console.error("Failed to delete booking from Sanity:", error);
  }
}

// Get guest attendee satuses for miltiple bookings from Google Calendar
export async function getBookingAttendeeStatuses(
  bookings: Array<{
    id: string;
    googleEventId: string | null;
    guestEmail: string;
  }>,
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await client.fetch(USER_WITH_TOKENS_QUERY, { clerkId: userId });
  if (!user?.connectedAccounts?.length) {
    return {};
  }

  // Find default account
  const account = user.connectedAccounts.find((a) => a.isDefault);
  if (!account?.accessToken || !account?.refreshToken) {
    return {};
  }
  const hostEmail = account.email;

  const statuses: Record<string, BookingStatuses> = {};

  // Fetch statuses in parallel
  const bookingsWithEvents = bookings.filter((b) => b.googleEventId);

  await Promise.all(
    bookingsWithEvents.map(async (booking) => {
      if (booking.googleEventId) {
        const { hostStatus, guestStatus } = await getEventAttendeeStatus(
          account,
          booking.googleEventId,
          hostEmail,
          booking.guestEmail,
        );

        // Cancelled event if deleted or declined
        const isCancelled =
          hostStatus === "declined" || guestStatus === "declined";
        statuses[booking.id] = { guestStatus, isCancelled };

        if (isCancelled) {
          await cleanupCancelledBooking(
            account,
            booking.id,
            booking.googleEventId,
            hostStatus !== "declined",
          );
        }
      }
    }),
  );
  return statuses;
}
