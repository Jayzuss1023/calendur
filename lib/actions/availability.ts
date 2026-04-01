"use server";
import { TimeBlock } from "@/components/calendar/types";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { writeClient } from "@/sanity/lib/writeClient";
import {
  HOST_ID_BY_CLERK_ID_QUERY,
  MEETING_TYPES_BY_HOST_QUERY,
  MeetingTypeForHost,
} from "@/sanity/queries/meetingTypes";
import {
  HAS_CONNECTED_ACCOUNT_QUERY,
  USER_ID_BY_CLERK_ID_QUERY,
  USER_SLUG_QUERY,
} from "@/sanity/queries/user";
import { auth, currentUser } from "@clerk/nextjs/server";
import { BookingQuotaStatus, getUserPlan, PLAN_LIMITS } from "../features";
import { endOfMonth, startOfMonth } from "date-fns";
import { COUNT_USER_BOOKINGS_QUERY } from "@/sanity/queries/bookings";
import { generateSlug, getBaseUrl } from "../urls";

type MeetingDuration = 15 | 30 | 45 | 60 | 90;

// Get or create user documebnt by ClerkId
export async function getOrCreateUser(clerkId: string) {
  // First try and find existing user
  const existingUser = await client.fetch(USER_ID_BY_CLERK_ID_QUERY, {
    clerkId,
  });

  if (existingUser) {
    return existingUser;
  }

  //   Get user details from Clerk
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("User not found in Clerk");
  }

  // Create new user document
  const newUser = await writeClient.create({
    _type: "user",
    clerkId,
    name:
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.username || "User",
    email: clerkUser.emailAddresses[0]?.emailAddress,
    availability: [],
  });

  return { _id: newUser._id };
}

export async function saveAvailability(blocks: TimeBlock[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getOrCreateUser(userId);

  // Convety blocks to Sanity format with new keys
  const sanityBlocks = blocks.map((block) => ({
    _key: crypto.randomUUID(),
    startDateTime: block.start.toISOString(),
    endDateTime: block.end.toISOString(),
  }));

  // Replace the entire availability array
  await writeClient
    .patch(user._id)
    .set({ availability: sanityBlocks })
    .commit();

  // Return the blocks with their new IDs
  return sanityBlocks.map((block) => ({
    id: block._key,
    start: block.startDateTime,
    end: block.endDateTime,
  }));
}

/**
 * Get or create the user's booking link
 */
export async function getOrCreateBookingLink(): Promise<{
  slug: string;
  url: string;
}> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get the user with slug
  const user = await client.fetch(USER_SLUG_QUERY, { clerkId: userId });

  if (!user) {
    // Create the user first
    const newUser = await getOrCreateUser(userId);
    const clerkUser = await currentUser();
    const name = clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName} || ""`.trim()
      : clerkUser?.username || "user";

    const baseSlug = generateSlug(name);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    await writeClient
      .patch(newUser._id)
      .set({ slug: { _type: "slug", current: uniqueSlug } })
      .commit();

    const baseUrl = getBaseUrl();
    return { slug: uniqueSlug, url: `${baseUrl}/book/${uniqueSlug}` };
  }

  // If slug exists, return it
  if (user.slug?.current) {
    const baseUrl = getBaseUrl();
    return {
      slug: user.slug.current,
      url: `${baseUrl}/book/${user.slug.current}`,
    };
  }

  // Create slug for existing user
  const name = user.name || "user";
  const baseSlug = generateSlug(name);
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  await writeClient
    .patch(user._id)
    .set({ slug: { _type: "slug", current: uniqueSlug } })
    .commit();

  const baseUrl = getBaseUrl();
  return { slug: uniqueSlug, url: `${baseUrl}/book/${uniqueSlug}` };
}

export async function createMeetingType(data: {
  name: string;
  duration: MeetingDuration;
  description?: string;
  isDefault?: boolean;
}): Promise<MeetingTypeForHost> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get the host's Sanity _id
  const hostId = await client.fetch(HOST_ID_BY_CLERK_ID_QUERY, {
    clerkId: userId,
  });

  if (!hostId) {
    // Create user first
    const user = await getOrCreateUser(userId);
    const slug = generateSlug(data.name);

    const meetingType = await writeClient.create({
      _type: "meetingType",
      name: data.name,
      slug: { _type: "slug", current: slug },
      duration: data.duration,
      description: data.description,
      isDefault: data.isDefault ?? true,
      host: { _type: "reference", _ref: user._id },
    });

    return {
      _id: meetingType._id,
      name: data.name,
      slug,
      duration: data.duration,
      description: data.description ?? null,
      isDefault: data.isDefault ?? true,
    };
  }

  const slug = generateSlug(data.name);

  const meetingType = await writeClient.create({
    _type: "meetingType",
    name: data.name,
    slug: { _type: "slug", current: slug },
    duration: data.duration,
    description: data.description,
    isDefault: data.isDefault ?? true,
    host: { _type: "reference", _ref: hostId },
  });

  return {
    _id: meetingType._id,
    name: data.name,
    slug,
    duration: data.duration,
    description: data.description ?? null,
    isDefault: data.isDefault ?? true,
  };
}

/**
 * Get or create the user's booking link with meeting type
 */
export async function getBookingLinkWithMeetingType(
  meetingTypeSlug: string,
): Promise<{
  url: string;
}> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Ensure user has a slug
  const { slug: userSlug } = await getOrCreateBookingLink();

  const baseUrl = getBaseUrl();
  return { url: `${baseUrl}/book/${userSlug}/${meetingTypeSlug}` };
}

export async function getMeetingTypes(): Promise<MeetingTypeForHost[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { data: meetingTypes } = await sanityFetch({
    query: MEETING_TYPES_BY_HOST_QUERY,
    params: { clerkId: userId },
  });

  return meetingTypes;
}

export async function getBookingQuota(): Promise<BookingQuotaStatus> {
  const { userId } = await auth();

  if (!userId) {
    return {
      used: 0,
      limit: 0,
      remaining: 0,
      isExceeded: true,
      plan: "free",
    };
  }

  const plan = await getUserPlan();
  const limit = PLAN_LIMITS[plan].maxBookingsPerMonth;

  // Count bookings this month
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const { data: used } = await sanityFetch({
    query: COUNT_USER_BOOKINGS_QUERY,
    params: { clerkId: userId, monthStart, monthEnd },
  });

  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  const isExceeded = limit !== Infinity && used >= limit;

  return { used, limit, remaining, isExceeded, plan };
}

export async function hasConnectedAccount(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const { data } = await sanityFetch({
    query: HAS_CONNECTED_ACCOUNT_QUERY,
    params: { clerkId: userId },
  });

  return data;
}
