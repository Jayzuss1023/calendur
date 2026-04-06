import { Clock } from "lucide-react";

interface HostHeaderProps {
  hostName: string | null;
  /** Optional meeting type info - If provided, shows meeting type as title */
  meetingType?: {
    name: string | null;
    duration: number;
    description?: string | null;
  };
  /** Subtitle text shown below the title */
  subtitle?: string;
}

/**
 * Shared host header component for booking pages
 * Displays avatar, host name, and optional meeting type info
 */
export function HostHeader({
  hostName,
  meetingType,
  subtitle,
}: HostHeaderProps) {
  const displayName = hostName ?? "Host";
  const initial = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="mb-8 text-center">
      {/* Avatar */}
      <div className="inline-flex h-16 w-16 bg-linear-to-br from-green-500 to-gray-600 items-center justify-center rounded-full text-2xl font-bold text-white mb-4">
        {initial}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {meetingType ? meetingType.name : displayName}
      </h1>

      {/* Subtitle / Host attribution */}
      {(subtitle || meetingType) && (
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {subtitle ?? `with ${displayName}`}
        </p>
      )}

      {/* Duration badge (only for meeting types) */}
      {meetingType && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-300">
          <Clock className="h-3.5 w-3.5" />
          {meetingType.duration} minutes
        </div>
      )}

      {/* Description (only for meeting types) */}
      {meetingType?.description && (
        <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          {meetingType.description}
        </p>
      )}
    </div>
  );
}
