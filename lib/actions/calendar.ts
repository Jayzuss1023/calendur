"use server";

import { auth } from "@clerk/nextjs/server";
import { writeClient } from "@/sanity/lib/writeClient";
import { client } from "@/sanity/lib/client";
import {
  USER_WITH_TOKENS_QUERY,
  type ConnectedAccountWithTokens,
} from "@/sanity/queries/user";
import { BOOKING_WITH_HOST_CALENDAR_QUERY } from "@/sanity/queries/bookings";
// import {
//   getCalendarClient,
//   revokeGoogleToken,
//   getEventAttendeeStatuses,
//   fetchCalendarEvents,
//   type AttendeeStatus,
// } from "@/lib/google-calendar";

/**
 * TYPES
 */

export type BusySlot = {
  start: string;
  end: string;
  accountEmail: string;
  title: string;
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
    // await revokeGoogleToken(account.accessToken);
  }
}
