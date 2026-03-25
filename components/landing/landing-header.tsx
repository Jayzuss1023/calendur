"use client";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function LandingHeader() {
  const pathname = usePathname();
  const isPricing = pathname === "/pricing";

  return (
    <header
      className={`fixed top-0 w-full border-b bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80 ${isPricing ? "" : "z-50"}`}
    >
      <div className="mx-auto max-w-7xl h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-green-500 flex items-center justify-center size-9 rounded-lg">
              <Calendar className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Calendur
            </span>
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Show when={"signed-out"}>
            <SignInButton mode="modal" forceRedirectUrl={"/availability"}>
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl={"/availability"}>
              <Button size="sm" className="bg-green-500 hover:bg-green-600">
                Sign Up
              </Button>
            </SignUpButton>
          </Show>
          <Show when={"signed-in"}>
            <Button
              asChild
              size="sm"
              className="bg-green-500 hover:bg-green-600"
            >
              <Link href="/availability">Dashboard</Link>
            </Button>
          </Show>
        </div>
      </div>
    </header>
  );
}
