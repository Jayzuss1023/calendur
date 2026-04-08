import type {
  HostBooking,
  HostUpcomingBooking,
} from "@/sanity/queries/bookings";
import {
  type BookingStatuses,
  getBookingAttendeeStatuses,
} from "./actions/calendar";
import type { AttendeeStatus } from "./google-calendar";

export type BookingWithGoogleEvent = Pick<
  HostBooking | HostUpcomingBooking,
  "_id" | "googleEventId" | "guestEmail"
>;

export type ProcessedBooking<T extends BookingWithGoogleEvent> = T & {
  guestStatus?: AttendeeStatus;
};

export async function processBookingsWithStatuses<
  T extends BookingWithGoogleEvent,
>(
  bookings: T[],
): Promise<{
  statuses: Record<string, BookingStatuses>;
  activeBookings: ProcessedBooking<T>[];
}> {
  const statuses = await getBookingAttendeeStatuses(
    bookings
      .filter((b) => b.googleEventId)
      .map((b) => ({
        id: b._id,
        googleEventId: b.googleEventId,
        guestEmail: b.guestEmail,
      })),
  );

  if (!statuses) throw new Error("No statuses found");

  // Filter out cancelled bookings and add status to each
  const activeBookings = bookings
    .filter((booking) => {
      // Keep bookings without Google events or those that are not cancelled
      const bookingStatus = statuses[booking._id];
      console.log(bookingStatus?.guestStatus);
      return !booking.googleEventId || !bookingStatus?.isCancelled;
    })
    .map((booking) => {
      const bookingStatus = statuses[booking._id];
      return {
        ...booking,
        guestStatus: bookingStatus?.guestStatus,
      };
    });

  return { statuses, activeBookings };
}
