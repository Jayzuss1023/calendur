import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "./hero-visual";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(59,130,246,0.12),transparent)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6 inline-flex border border-green-200 bg-green-50 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-green-700 dark:border-greenlue-800 dark:bg-green-950 dark:text-green-300">
            <Sparkles size="4" />
            Scheduling made simple
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-white">
            Schedule meetings{" "}
            <span className="text-green-500">without the back-and-forth</span>
          </h1>
          <p>
            Calendur connects to your Google Calendar, shows you real-time
            availability, and lets anyone book time with you instantly. No more
            &quot;what time works for you&quot; emails.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Show when={"signed-out"}>
              <SignUpButton mode="modal">
                <Button
                  size="lg"
                  className="w-full bg-green-500 text-base hover:bg-green-600 sm:w-auto"
                >
                  Start Scheduling Free
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full text-base sm:w-auto"
                >
                  Sign In
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Button
                asChild
                size="lg"
                className="w-full bg-green-500 text-base hover:bg-green-600 sm:w-auto"
              >
                <Link href="/availability">Go to Dashboard</Link>
              </Button>
            </Show>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
