import { Show, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="bg-green-500 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to simplify your scheduling?
          </h2>
          <p className="mt-4 text-lg text-green-100">
            Join thousands of professionals who save hours every week with
            Calvero.
          </p>
          <div className="mt-10">
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <Button
                  size="lg"
                  className="bg-white text-base text-green-600 hover:bg-green-50"
                >
                  Get Started Free
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button
                asChild
                size="lg"
                className="bg-white text-base text-green-600 hover:bg-green-50"
              >
                <Link href="/availability">Go to Dashboard</Link>
              </Button>
            </Show>
          </div>
        </div>
      </div>
    </section>
  );
}
