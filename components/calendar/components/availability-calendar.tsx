"use client";

import { useState, useTransition } from "react";
import { Calendar, Views, type View } from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import {
  Loader2,
  Save,
  Undo2,
  Clock,
  User,
  Mail,
  Video,
  ExternalLink,
} from "lucide-react";
import {
  format,
  differenceInMinutes,
  isBefore,
  startOfDay,
  formatDuration,
  getHours,
  getMinutes,
} from "date-fns";

import { localizer } from "../lib/localizer";

import {
  CALENDAR_CONFIG,
  MAX_TIME,
  MIN_TIME,
  AVAILABILITY_COLORS,
  BUSY_BLOCK_COLORS,
  BOOKING_STATUS_COLORS,
} from "../lib/constants";

import {
  calendarFormats,
  calendarMessages,
  formatTimeRange,
} from "../lib/formats";
// import { useCalendarEvents } from "../hooks/use-calendar-events";
// import { CalendarToolbar } from "./calendar-toolbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// import { saveAvailability } from "@/lib/actions/availability";
import type {
  TimeBlock,
  BusyBlock,
  BookedBlock,
  CalendarEvent,
  TimeBlockInteraction,
  SlotInfo,
} from "@/components/calendar/types";
import { isBusyBlock, isBookedBlock } from "@/components/calendar/types";
import { auth } from "@clerk/nextjs/server";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

interface AvailabilityCalendarProps {
  initialBlocks?: TimeBlock[];
  busyBlocks?: BusyBlock[];
  bookedBlocks?: BookedBlock[];
}

export function AvailabilityCalendar({
  initialBlocks = [],
  busyBlocks = [],
  bookedBlocks = [],
}: AvailabilityCalendarProps) {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<BookedBlock | null>(
    null,
  );
  const [isSaving, startSaveTransition] = useTransition();

  const allEvents: CalendarEvent[] = [
    // ...events,
    ...busyBlocks,
    ...bookedBlocks,
  ];
  const now = new Date();

  // const {
  //   events,
  //   hasChanges,
  //   handleSelectSlot,
  //   handleEventDrop,
  //   handleEventResize,
  //   removeBlock,
  //   copyDayToWeek,
  //   clearWeek,
  //   discardChanges,
  //   markAsSaved,
  //   getEventsForSave,
  // } = useCalendarEvents(initialBlocks);

  // Format duration in a readable way

  const isMonthView = view === Views.MONTH;

  const drillDown = (targetDate: Date) => {
    setDate(targetDate);
    setView(Views.WEEK);
  };

  const onSlotSelect = (slotInfo: SlotInfo) => {
    // Don't allow selecting slots in the past
    if (isBefore(slotInfo.end, now)) return;
    isMonthView ? drillDown(slotInfo.start) : null;
  };

  const onBlockSelect = (block: CalendarEvent) => {
    // Show dialog for booked blocks
    if (isBookedBlock(block)) {
      setSelectedBooking(block);
      return;
    }
  };

  let difference;
  if (selectedBooking) {
    difference = `${differenceInMinutes(
      selectedBooking.start,
      selectedBooking.end,
    )
      .toString()
      .replace("-", "")} minutes`;
  }

  return (
    <div className="relative h-[calc(100vh-180px)] min-h-[400px] sm:min-h-[600px]">
      {/* Booking Details Dialog */}
      <Dialog
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div />
              Meeting Details
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 pt-2">
              {/* Guest Status Badge */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  selectedBooking.attendeeStatus === "declined"
                    ? "bg-red-100 text-red-700"
                    : selectedBooking.attendeeStatus === "tentative"
                      ? "bg-amber-100 text-amber-700"
                      : selectedBooking.attendeeStatus === "accepted"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {selectedBooking.attendeeStatus === "declined" &&
                  "Guest Declined"}
                {selectedBooking.attendeeStatus == "tentative" &&
                  "Guest Tentative"}
                {selectedBooking.attendeeStatus == "accepted" &&
                  "Guest Accepted"}
                {selectedBooking.attendeeStatus == "needsAction" &&
                  "Guest: Awaiting Response"}
                {!selectedBooking.attendeeStatus && "Guest Status Unknown"}
              </div>
              <div>
                <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p>{selectedBooking.guestName}</p>
                  <p>Guest</p>
                </div>
                <div>
                  <Mail className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <a href={`mailto:${selectedBooking.guestEmail}`}>
                      {selectedBooking.guestEmail}
                    </a>
                    <p>Email</p>
                  </div>
                </div>
                <div>
                  <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p>{format(selectedBooking.start, "EEEE, MMMM d, yyyy")}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedBooking.start, "h:mm a")} –{" "}
                      {format(selectedBooking.end, "h:mm a")} ({difference})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DnDCalendar
        localizer={localizer}
        style={{ height: "100%" }}
        formats={calendarFormats}
        messages={calendarMessages}
        events={allEvents}
        view={view}
        date={date}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        onView={setView}
        onNavigate={setDate}
        onDrillDown={drillDown}
        startAccessor="start"
        endAccessor="end"
        // titleAccessor={getBlockTitle}

        // eventPropGetter={eventStyleGetter}
        selectable
        resizable={!isMonthView}
        draggableAccessor={(event) =>
          !isMonthView && !isBusyBlock(event) && !isBookedBlock(event)
        }
        popup
        onSelectEvent={onBlockSelect}
        // onEventDrop={(args) => {
        //   if (
        //     !isMonthView &&
        //     !isBusyBlock(args.event) &&
        //     !isBookedBlock(args.event)
        //   ) {
        //     handleEventDrop(adaptEventArgs(args));
        //   }
        // }}

        // onEventResize={(args) => {
        //   if (
        //     !isMonthView &&
        //     !isBusyBlock(args.event) &&
        //     !isBookedBlock(args.event)
        //   ) {
        //     handleEventResize(adaptEventArgs(args));
        //   }
        // }}
        min={MIN_TIME}
        max={MAX_TIME}
        step={CALENDAR_CONFIG.step}
        timeslots={CALENDAR_CONFIG.timeslots}
        // slotPropGetter={slotPropGetter}
        // dayPropGetter={dayPropGetter}
        // components={{ toolbar: ToolbarWithActions }}
      />
    </div>
  );
}
