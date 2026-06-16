import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { TelemetryStrip } from "@/components/landing/telemetry-strip";
import { BentoGrid } from "@/components/landing/bento-grid";
import { WorkflowSteps } from "@/components/landing/workflow-steps";
import { PricingMatrix } from "@/components/landing/pricing-matrix";
import { Footer } from "@/components/landing/footer";

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <TelemetryStrip />
      <BentoGrid />
      <WorkflowSteps />
      <PricingMatrix />
      <Footer />
    </main>
  );
}
