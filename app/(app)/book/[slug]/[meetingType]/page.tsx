import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { sanityFetch } from "@/sanity/lib/live";
import { MEETING_TYPES_BY_HOST_SLUG_QUERYResult } from "@/sanity.types";
import { ALL_BOOKINGS_BY_HOST_SLUG_QUERY } from "@/sanity/queries/bookings";
import {
  computeAvailableDates,
  computeAvailableSlots,
} from "@/lib/availability";
//   import { getActivebookingIds } from "@/lib/actions/calendar";
import { getGoogleBusyTimes } from "@/lib/actions/bookings";
import { getHostBookingQuotaStatus } from "@/lib/features";
import { HostHeader } from "@/components/booking/host-header";
import { BookingCalendar } from "@/components/booking/booking-calendar";
import { startOfDay, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { MEETING_TYPE_BY_SLUGS_QUERY } from "@/sanity/queries/meetingTypes";
import { QuotaExceeded } from "@/components/booking/quota-exceeded";
import { getActivebookingIds } from "@/lib/actions/calendar";

interface BookingPageProps {
  params: Promise<{ slug: string; meetingType: string }>;
}

export default async function MeetingTypeBookingPage({
  params,
}: BookingPageProps) {
  const { slug, meetingType } = await params;

  // ====================
  // BOOKING QUOTA CHECK
  // ====================
  const quotaStatus = await getHostBookingQuotaStatus(slug);

  // ============================= //
  // TIMEZONE-AWARE DATE GROUPING //
  // =============================//
  /**
   * Read the visitor's timezone from cookie
   * If no cookie exists (first visit before JS runs), fall back to UTC
   * Page rerenders once cookie is set
   */
  const cookieStore = await cookies();

  let visitorTimezone = cookieStore.get("timezone")?.value ?? "UTC";

  try {
    Intl.DateTimeFormat(undefined, { timeZone: visitorTimezone });
  } catch {
    visitorTimezone = "UTC";
  }

  const [{ data: meetingTypeData }, { data: bookings }] = await Promise.all([
    sanityFetch({
      query: MEETING_TYPE_BY_SLUGS_QUERY,
      params: { hostSlug: slug, meetingTypeSlug: meetingType },
    }),
    sanityFetch({
      query: ALL_BOOKINGS_BY_HOST_SLUG_QUERY,
      params: { hostSlug: slug },
    }),
  ]);

  if (!meetingTypeData || !meetingTypeData.host) {
    notFound();
  }

  const host = meetingTypeData.host;
  const duration = meetingTypeData.duration ?? 30;
  const availability = host.availability ?? [];
  const allBookingsRaw = bookings ?? [];

  // Return quota exceeded component if Host's quota is exceeded
  if (quotaStatus.isExceeded) {
    return <QuotaExceeded hostName={host.name ?? "This host"} />;
  }

  // =====================
  // GOOGLE CALENDAR SYNC
  // =====================
  const hostAccount = host.connectedAccounts?.find((a) => a.isDefault) ?? null;
  const activeBookingIds = await getActivebookingIds(
    hostAccount
      ? {
          _key: hostAccount._key,
          email: hostAccount.email,
          accessToken: hostAccount.accessToken,
          refreshToken: hostAccount.refreshToken,
          expiryDate: hostAccount.expiryDate,
        }
      : null,
    allBookingsRaw.map((b) => ({
      id: b._id,
      googleEventId: b.googleEventId,
      guestEmail: b.guestEmail,
    })),
  );

  // Only include active bookings (not cancelled in Google Calendar)
  const allBookings = allBookingsRaw.filter((b) => activeBookingIds.has(b._id));

  // ============================
  // GOOGLE CALENDAR BUSY TIMES

  const today = startOfDay(new Date());
  // Find the latest availability end block
  const latestEndDate = availability.reduce<Date>((latest, slot) => {
    const slotEnd = parseISO(slot.endDateTime);
    return slotEnd > latest ? slotEnd : latest;
  }, today);

  // Fetch busy times from all connected Google Calendar accounts
  const busyTimes = await getGoogleBusyTimes(
    host.connectedAccounts,
    today,
    latestEndDate,
  );

  // Compute available dates
  const serverDates = computeAvailableDates(
    availability,
    allBookings,
    today,
    latestEndDate,
    duration,
    busyTimes,
  );

  // Group slots by date in Visitor's Timezone
  const slotsByDate: Record<string, Array<{ start: string; end: string }>> = {};

  for (const dateStr of serverDates) {
    const date = new Date(dateStr);

    const slots = computeAvailableSlots(
      availability,
      allBookings,
      date,
      duration,
      busyTimes,
    );

    // Group each slot by its date in the VISITOR's timezone
    for (const slot of slots) {
      // Using visitor's timezone - format date key (2025-01-15)
      const localDateKey = formatInTimeZone(
        slot.start,
        visitorTimezone,
        "yyyy-MM-dd",
      );

      if (!slotsByDate[localDateKey]) {
        slotsByDate[localDateKey] = [];
      }

      slotsByDate[localDateKey].push({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      });
    }
  }

  // Get available dates (Associated to visitor's timezone)
  const availableDates = Object.keys(slotsByDate).sort();

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <HostHeader
          hostName={host.name}
          meetingType={{
            name: meetingTypeData.name,
            duration: meetingTypeData.duration ?? 30,
            description: meetingTypeData.description,
          }}
        />

        {/* Booking.Calendar - reveives slots pre-grouped by visitor's timezone */}
        <BookingCalendar
          hostSlug={slug}
          hostName={host.name ?? "Host"}
          meetingTypeSlug={meetingType}
          meetingTypeName={meetingTypeData.name ?? "Meeting"}
          duration={duration}
          availableDates={availableDates}
          slotsByDate={slotsByDate}
          timezone={visitorTimezone}
        />
      </div>
    </main>
  );
}
