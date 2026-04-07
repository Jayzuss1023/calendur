"use server";

import {
  HOST_BY_SLUG_WITH_TOKENS_QUERY,
  HostWithTokens,
} from "@/sanity/queries/user";
import {
  fetchCalendarEvents,
  getCalendarClient,
  getEventAttendeeStatus,
} from "../google-calendar";
import { client } from "@/sanity/lib/client";
import { getHostBookingQuotaStatus } from "../features";
import { MEETING_TYPE_BY_SLUGS_QUERY } from "@/sanity/queries/meetingTypes";
import { BOOKINGS_IN_RANGE_QUERY } from "@/sanity/queries/bookings";
import { parseISO } from "date-fns";
import { writeClient } from "@/sanity/lib/writeClient";

export type BookingData = {
  hostSlug: string;
  meetingTypeSlug?: string;
  startTime: Date;
  endTime: Date;
  guestName: string;
  guestEmail: string;
  notes?: string;
};
/**
 * Get Google Calendar busy times from connected accounts
 */
export async function getGoogleBusyTimes(
  connectedAccounts: HostWithTokens["connectedAccounts"],
  startDate: Date,
  endDate: Date,
): Promise<Array<{ start: Date; end: Date }>> {
  const events = await fetchCalendarEvents(
    connectedAccounts ?? [],
    startDate,
    endDate,
  );

  return events.map((event) => ({
    start: event.start,
    end: event.end,
  }));
}

/**
 * Create a booking
 */

export async function createBooking(data: BookingData) {
  // 1. Get the host
  const host = await client.fetch(HOST_BY_SLUG_WITH_TOKENS_QUERY, {
    slug: data.hostSlug,
  });

  if (!host) {
    throw new Error("Host not found");
  }

  // 2. Check if host has exceeded their monthly booking quota
  const quotaStatus = await getHostBookingQuotaStatus(data.hostSlug);
  if (quotaStatus.isExceeded) {
    throw new Error("Host has reached their monthly booking limit");
  }

  // 3. Get the meeting type if provided
  let meetingTypeId: string | undefined;
  let meetingTypeName: string | undefined;

  if (data.meetingTypeSlug) {
    const meetingType = await client.fetch(MEETING_TYPE_BY_SLUGS_QUERY, {
      hostSlug: data.hostSlug,
      meetingTypeSlug: data.meetingTypeSlug,
    });

    if (meetingType) {
      meetingTypeId = meetingType._id;
      meetingTypeName = meetingType.name ?? undefined;
    }
  }

  // 4. Is slot still available?
  const isAvailable = await checkSlotAvailable(
    host,
    data.startTime,
    data.endTime,
  );

  if (!isAvailable) {
    throw new Error("This time slot is no longer available");
  }

  // 5. Use the default account for creating calendar events
  const defaultAccount = host.connectedAccounts?.find((a) => a.isDefault);

  let googleEventId: string | undefined;
  let meetLink: string | undefined;

  // 6. Create Google Calendar event with connected account
  if (defaultAccount?.accessToken && defaultAccount?.refreshToken) {
    try {
      const calendar = await getCalendarClient(defaultAccount);

      // Event summary with meeting type
      const summary = meetingTypeName
        ? `${meetingTypeName}: ${host.name} x ${data.guestName}`
        : `Meeting: ${host.name} x ${data.guestName}`;

      const event = await calendar.events.insert({
        calendarId: "primary",
        sendUpdates: "all", // Sends email invites to attendees
        conferenceDataVersion: 1, // Required for conference data
        requestBody: {
          summary,
          description: data.notes || undefined,
          start: {
            dateTime: data.startTime.toISOString(),
          },
          end: {
            dateTime: data.endTime.toISOString(),
          },
          attendees: [
            { email: host.email, responseStatus: "accepted" },
            { email: data.guestEmail },
          ],
          conferenceData: {
            createRequest: {
              requestId: `booking-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          },
        },
      });

      googleEventId = event.data.id ?? undefined;
      meetLink = event.data.hangoutLink ?? undefined;
    } catch (error) {
      console.error("Failed to create Google Calendar event:", error);
      // Continue without calendar event - booking still valid
    }
  }

  // 7. Create booking in Sanity
  const booking = await writeClient.create({
    _type: "booking",
    host: { _type: "reference", _ref: host._id },
    ...(meetingTypeId && {
      meetingType: { _type: "reference", _ref: meetingTypeId },
    }),
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    startTime: data.startTime.toISOString(),
    endTime: data.endTime.toISOString(),
    googleEventId,
    meetLink,
    status: "confirmed",
    notes: data.notes,
  });

  return { _id: booking._id };
}

/**
 * Check if time slot still available
 */

async function checkSlotAvailable(
  host: HostWithTokens,
  startTime: Date,
  endTime: Date,
) {
  const existingBookings = await client.fetch(BOOKINGS_IN_RANGE_QUERY, {
    hostId: host._id,
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
  });
  // Get attendee stauses for overlapping bookings
  const defaultAccount = host.connectedAccounts?.find((a) => a.isDefault);
  const declinedBookingIds = new Set<string>();

  if (defaultAccount?.accessToken && defaultAccount?.refreshToken) {
    // Find overlapped bookings
    const overlappingBookings = existingBookings.filter((booking) => {
      const bookingStart = parseISO(booking.startTime);
      const bookingEnd = parseISO(booking.endTime);
      return startTime < bookingEnd && endTime > bookingStart;
    });

    // Check attendee status
    await Promise.all(
      overlappingBookings
        .filter((b) => b.googleEventId && b.guestEmail)
        .map(async (booking) => {
          // Skip for no googleEventId
          if (!booking.googleEventId) return;

          try {
            const status = await getEventAttendeeStatus(
              defaultAccount,
              booking.googleEventId,
              booking.guestEmail,
            );

            if (status === "declined") {
              declinedBookingIds.add(booking._id);
            }
          } catch {
            // If we can't check status, assume booking is still valid
          }
        }),
    );
  }
  // Check for any overlapped bookings
  return !existingBookings.some((booking) => {
    if (declinedBookingIds.has(booking._id)) return false; // Declined = available
    const bookingStart = parseISO(booking.startTime);
    const bookingEnd = parseISO(booking.endTime);
    return startTime < bookingEnd && endTime > bookingStart;
  });
}
