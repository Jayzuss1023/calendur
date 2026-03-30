"use server";
import { TimeBlock } from "@/components/calendar/types";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/writeClient";
import { USER_ID_BY_CLERK_ID_QUERY } from "@/sanity/queries/user";
import { auth, currentUser } from "@clerk/nextjs/server";

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
