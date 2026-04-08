"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { ToolbarProps, View } from "react-big-calendar";
import { Button } from "@/components/ui/button";
import type { TimeBlock } from "../types";
import { CopyDayPopover } from "./copy-day-popover";

interface CustomToolbarProps {
  onCopyDayToWeek?: (dayIndex: number, includeWeekends: boolean) => void;
  onClearWeek?: () => void;
  showCopyButton?: boolean;
}

type CalendarToolbarProps = ToolbarProps<TimeBlock, object> &
  CustomToolbarProps;

export function CalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
  views,
  onCopyDayToWeek,
  onClearWeek,
  showCopyButton = false,
}: CalendarToolbarProps) {
  const viewOptions = Array.isArray(views) ? views : [];

  const handleClearWeek = () => {
    if (
      window.confirm("Are you sure you watn to clear all events this week?")
    ) {
      onClearWeek?.();
    }
  };

  return (
    <div className="mb-4 flex items-ceter justify-between gap-2">
      {/* Left: View Switcher */}
      <div className="flex gap-1">
        {viewOptions.map((opt) => (
          <Button
            key={opt}
            variant={view === opt ? "default" : "outline"}
            size="sm"
            onClick={() => onView(opt as View)}
            className="max-sm:h-8 max-sm:w-8 max-sm:p-0"
          >
            <span className="hidden sm:inline">
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </span>
          </Button>
        ))}
      </div>

      {/* Center: Current Date Label */}
      <span className="text-lg font-semibold max-sm:text-sm">{label}</span>

      {/* Right: Actions + Navigation */}
      <div className="flex items-center gap-2">
        {showCopyButton && (
          <div className="flex items-center gap-2">
            {onCopyDayToWeek && <CopyDayPopover onCopy={onCopyDayToWeek} />}
            {onClearWeek && (
              <Button
                variant="destructive"
                size="sm"
                className="max-sm:h-8 max-sm:w-8 max-sm:p-0"
                onClick={handleClearWeek}
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Clear Week</span>
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("TODAY")}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
