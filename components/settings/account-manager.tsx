"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
// import {
//   disconnectGoogleAccount,
//   setDefaultCalendarAccount,
// } from "@/lib/actions/calendar";
import type { ConnectedAccountDisplay } from "@/sanity/queries/user";
import type { PlanType } from "@/lib/features";

interface AccountManagerProps {
  connectedAccounts: ConnectedAccountDisplay[];
  maxCalendars: number;
  plan: PlanType;
}

export function AccountManager({
  connectedAccounts,
  maxCalendars,
  plan,
}: AccountManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingActiong] = useState<string | null>(null);

  const currentCount = connectedAccounts.length;
  const isAtLimit = currentCount >= maxCalendars;
  const isUnlimited = maxCalendars === Infinity;

  const handleConnect = () => {
    // Redirect to OAuth connect endpoint
    window.location.href = "/api/calendar/connect";
  };

  const handleDisconnect = async (accountKey: string) => {
    setPendingActiong(`disconnect-${accountKey}`);
    startTransition(async () => {
      try {
      } catch (error) {}
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Connected Google Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Google Calendar to sync busy times and create events.
          </p>
          {!isUnlimited && (
            <p className="mt-1 text-sm text-muted-foreground">
              {currentCount}/{maxCalendars} calendars connected ({plan} plan)
            </p>
          )}
        </div>
        {isAtLimit ? (
          <Button asChild>
            <Link href="/pricing">
              Unlock more
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button onClick={handleConnect} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Connect Account
          </Button>
        )}
      </div>

      {connectedAccounts.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No accounts connected yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect a Google account to sync your calendar
          </p>
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
}
