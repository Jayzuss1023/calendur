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
 * Get the count of connected calendar accouts for the current user
 */
