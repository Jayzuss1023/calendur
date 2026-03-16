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
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const currentCount = connectedAccounts.length;
  const isAtLimit = currentCount >= maxCalendars;
  const isUnlimited = maxCalendars === Infinity;

  const handleConnect = () => {
    // Redirect to OAuth connect endpoint
    window.location.href = "/api/calendar/connect";
  };
}
