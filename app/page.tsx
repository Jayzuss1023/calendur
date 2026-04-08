import { CTASection } from "@/components/landing/cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { IntegrationSection } from "@/components/landing/integration-section";
import { LandingHeader } from "@/components/landing/landing-header";
export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <LandingHeader />
      <HeroSection />
      <HowItWorksSection />
      <IntegrationSection />
      <CTASection />
    </div>
  );
}
