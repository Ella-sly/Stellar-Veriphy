import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { EcosystemSection } from "@/components/landing/EcosystemSection";
import { CallToActionSection } from "@/components/landing/CallToActionSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 scroll-smooth">
      <Header />
      <div className="pt-16">
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <EcosystemSection />
        <CallToActionSection />
      </div>
    </main>
  );
}
