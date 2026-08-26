import { Footer } from "@/components/Footer";
import { AboutSection } from "@/components/landing/AboutSection";
import { CallToActionSection } from "@/components/landing/CallToActionSection";
import { EcosystemSection } from "@/components/landing/EcosystemSection";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

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
        <Footer />
      </div>
    </main>
  );
}
