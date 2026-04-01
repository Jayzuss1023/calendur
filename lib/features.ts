import { auth, clerkClient } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { startOfMonth, endOfMonth } from "date-fns";

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

export type BookingQuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
  isExceeded: boolean;
  plan: PlanType;
};
