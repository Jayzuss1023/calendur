"use server";

import {
  HOST_BY_SLUG_WITH_TOKENS_QUERY,
  HostWithTokens,
} from "@/sanity/queries/user";
import { fetchCalendarEvents } from "../google-calendar";
import { client } from "@/sanity/lib/client";
import { getHostBookingQuotaStatus } from "../features";

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
  const quotsStatus = await getHostBookingQuotaStatus(data.hostSlug);
}
