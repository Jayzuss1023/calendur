import {
  addDays,
  addMinutes,
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";

export type AvailabilitySlot = {
  _key: string;
  startDateTime: string;
  endDateTime: string;
};

export type BookingSlot = {
  _id: string;
  startTime: string;
  endTime: string;
};

export type BusyTime = {
  start: Date;
  end: Date;
};

/**
 * Compute available dates from host availability and existing bookings.
 * This is a pure function that doesn't fetch any data.
 *
 * @param availability - Host's availability slots
 * @param bookings - Existing confirmed bookings
 * @param startDate - Range start
 * @param endDate - Range end
 * @param slotDurationMinutes - Duration of each slot
 * @param busyTimes - Optional Google Calendar busy times
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function computeAvailableDates(
  availability: AvailabilitySlot[],
  bookings: BookingSlot[],
  startDate: Date, // This is today's date
  endDate: Date,
  slotDurationMinutes = 30,
  busyTimes: BusyTime[] = [],
) {
  const availableDates: string[] = [];
  let currentDate = startOfDay(startDate);
  const today = startOfDay(new Date());

  while (currentDate <= endDate) {
    if (currentDate < today) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);

    // Find availability blocks for this day
    const availabilityForDate = availability.filter((slot) => {
      const slotStart = parseISO(slot.startDateTime);
      const slotEnd = parseISO(slot.endDateTime);

      return (
        isWithinInterval(slotStart, { start: dayStart, end: dayEnd }) ||
        isWithinInterval(slotEnd, { start: dayStart, end: dayEnd }) ||
        (slotStart <= dayStart && slotEnd >= dayEnd)
      );
    });

    if (availabilityForDate.length > 0) {
      const hasAvailableSlot = checkDayHasAvailableSlot(
        availabilityForDate,
        bookings,
        dayStart,
        dayEnd,
        slotDurationMinutes,
        busyTimes,
      );

      if (hasAvailableSlot) {
        // Format as YYY-MM-DD in local timezone (not UTC)
        availableDates.push(format(currentDate, "yyy-MM-dd"));
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return availableDates;
}

/**
 * Available time slots for dates.
 * No data fetching
 */
export function computeAvailableSlots(
  availability: AvailabilitySlot[],
  bookings: BookingSlot[],
  date: Date,
  slotDurationMinutes = 30,
  busyTimes: BusyTime[] = [],
): Array<{ start: Date; end: Date }> {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const now = new Date();
  const slots: Array<{ start: Date; end: Date }> = [];

  // Availabiliy blocks for this day
  const availabilityForDate = availability.filter((slot) => {
    const slotStart = parseISO(slot.startDateTime);
    const slotEnd = parseISO(slot.endDateTime);

    return (
      isWithinInterval(slotStart, { start: dayStart, end: dayEnd }) ||
      isWithinInterval(slotEnd, { start: dayStart, end: dayEnd }) ||
      (slotStart <= dayStart && slotEnd >= dayEnd)
    );
  });

  for (const availSlot of availabilityForDate) {
    const availStart = parseISO(availSlot.startDateTime);
    const availEnd = parseISO(availSlot.endDateTime);
    // Clamp to day boundaries
    // availStart = 12:30 AM || dayStart = 12:00 AM. Proves false so availStart returns
    const slotStart = availStart < dayStart ? dayStart : availStart;
    const slotEnd = availEnd > dayEnd ? dayEnd : availEnd;

    // Generate potential slots
    let currentStart = slotStart;

    while (addMinutes(currentStart, slotDurationMinutes) <= slotEnd) {
      const currentEnd = addMinutes(currentStart, slotDurationMinutes);

      // Skip slots in the past
      if (currentStart < now) {
        currentStart = currentEnd;
        continue;
      }

      // Check if this slot is blocked by a booking
      const hasBookingConflict = bookings.some((booking) => {
        const bookingStart = parseISO(booking.startTime);
        const bookingEnd = parseISO(booking.endTime);
        return currentStart < bookingEnd && currentEnd > bookingStart;
      });

      const hasBusyConflict = busyTimes.some((busy) => {
        return currentStart < busy.end && currentEnd > busy.start;
      });

      if (!hasBookingConflict && !hasBusyConflict) {
        slots.push({
          start: new Date(currentStart),
          end: new Date(currentEnd),
        });
      }
      currentStart = currentEnd;
    }
  }

  return slots;
}

/**
 * Check if a specific day has at least one available slot
 */
function checkDayHasAvailableSlot(
  availabilityForDate: AvailabilitySlot[],
  bookings: BookingSlot[],
  dayStart: Date,
  dayEnd: Date,
  slotDurationMinutes: number,
  busyTimes: BusyTime[],
) {
  for (const availSlot of availabilityForDate) {
    const availStart = parseISO(availSlot.startDateTime);
    const availEnd = parseISO(availSlot.endDateTime);

    // console.log(availStart, "-", dayStart);

    const slotStart = availStart < dayStart ? dayStart : availStart;
    const slotEnd = availEnd > dayEnd ? dayEnd : availEnd;

    // Gneral potential slots
    let currentStart = slotStart;
    while (addMinutes(currentStart, slotDurationMinutes) <= slotEnd) {
      const currentEnd = addMinutes(currentStart, slotDurationMinutes);

      // Check if this slot is blocked by a booking
      const hasBookingConflict = bookings.some((booking) => {
        const bookingStart = parseISO(booking.startTime);
        const bookingEnd = parseISO(booking.endTime);
        return currentStart < bookingEnd && currentEnd > bookingStart;
      });

      // Check if this slot is blocked by busy time
      const hasBusyConflict = busyTimes.some((busy) => {
        return currentStart < busy.end && currentEnd > busy.start;
      });

      if (!hasBookingConflict && !hasBusyConflict) {
        return true;
      }
      currentStart = currentEnd;
    }
  }
  return false;
}
