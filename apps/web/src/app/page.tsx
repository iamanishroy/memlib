import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { FeatureSection } from "@/components/feature-section";
import { Integrations } from "@/components/integrations";
import { FaqsPage } from "@/components/faqs-page";
import { CallToAction } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />
      <HeroSection />
      <div id="features" className="mx-auto max-w-5xl px-4 py-20">
        <FeatureSection />
      </div>
      <Integrations />
      <div className="py-20">
        <FaqsPage />
      </div>
      <div className="px-4 pb-20">
        <CallToAction />
      </div>
      <Footer />
    </div>
  );
}
