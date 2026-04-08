import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { sanityFetch } from "@/sanity/lib/live";
import { HOST_BOOKINGS_BY_CLERK_ID_QUERY } from "@/sanity/queries/bookings";
import { processBookingsWithStatuses } from "@/lib/booking-utils";
import { BookingsList } from "@/components/booking/bookings-list";
import { RefreshButton } from "@/components/ui/refresh-button";

export default async function BookingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { data: bookings } = await sanityFetch({
    query: HOST_BOOKINGS_BY_CLERK_ID_QUERY,
    params: { clerkId: userId },
  });

  const { activeBookings } = await processBookingsWithStatuses(bookings ?? []);
  console.log(activeBookings);
  return (
    <main>
      <div>
        <div>
          <h1>Your Bookings</h1>
          <p>View and manager your upcoming meetings</p>
        </div>
        <RefreshButton />
      </div>

      <BookingsList bookings={activeBookings} />
    </main>
  );
}
