import { auth, clerkClient } from "@clerk/nextjs/server";
import { endOfMonth, startOfMonth } from "date-fns";

import { client } from "@/sanity/lib/client";
import {
  COUNT_HOST_BOOKINGS_QUERY,
  HOST_CLERK_ID_BY_SLUG_QUERY,
} from "@/sanity/queries/user";

export type PlanType = "free" | "starter" | "pro";

export const PLAN_LIMITS = {
  free: {
    maxConnectedCalendars: 1,
    maxBookingsPerMonth: 2,
  },
  starter: {
    maxConnectedCalendars: 3,
    maxBookingsPerMonth: 10,
  },
  pro: {
    maxConnectedCalendars: Infinity,
    maxBookingsPerMonth: Infinity,
  },
} as const;

/**
 * Get the current user's plan based on Clerk subscription
 */
export async function getUserPlan(): Promise<PlanType> {
  const { has } = await auth();
  if (has({ plan: "pro" })) return "pro";
  if (has({ plan: "starter" })) return "starter";
  return "free";
}

/**
 * Get the plan limits for the current user
 */
export async function getUserPlanLimits() {
  const plan = await getUserPlan();
  return { ...PLAN_LIMITS[plan], plan };
}

/**
 * Pull host's plan checking their Clerk subscription from the backend API
 * Used for public pages where we can't use auth()
 */
export async function getHostPlan(hostClerkId: string): Promise<PlanType> {
  try {
    const clerk = await clerkClient();
    const subscription =
      await clerk.billing.getUserBillingSubscription(hostClerkId);

    // Check for active subscription
    // Stored in publicMetadata or subscription
    const planName = subscription.subscriptionItems[0].plan?.slug as
      | string
      | undefined;

    if (planName === "pro") return "pro";
    if (planName === "starter") return "starter";

    return "free";
  } catch (error) {
    console.error("Failed to fetch host plan from Clerk:", error);
    return "free";
  }
}

export type BookingQuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
  isExceeded: boolean;
  plan: PlanType;
};

/**
 * Get booking quota status for host (params slug)
 * Grabbed from public booking pages
 */
export async function getHostBookingQuotaStatus(
  hostSlug: string,
): Promise<BookingQuotaStatus> {
  const hostClerkId = await client.fetch<string | null>(
    HOST_CLERK_ID_BY_SLUG_QUERY,
    { hostSlug },
  );

  if (!hostClerkId) {
    return {
      used: 0,
      limit: 0,
      remaining: 0,
      isExceeded: true,
      plan: "free",
    };
  }

  // Get host's plan from the using Clerk BACKEND Get API
  const plan = await getHostPlan(hostClerkId);
  const limit = PLAN_LIMITS[plan].maxBookingsPerMonth;

  // Count bookings this month
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const used = await client.fetch<number>(COUNT_HOST_BOOKINGS_QUERY, {
    hostSlug,
    monthStart,
    monthEnd,
  });

  const remaining = Math.max(0, limit - used);
  const isExceeded = used >= limit;

  return { used, limit, remaining, isExceeded, plan };
}
