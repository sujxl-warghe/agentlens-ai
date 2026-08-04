import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { Demo } from "@/components/marketing/demo";
import { Architecture } from "@/components/marketing/architecture";
import { Footer } from "@/components/marketing/footer";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <Demo />
      <Architecture />
      <Footer />
    </>
  );
}
