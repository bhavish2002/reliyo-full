import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import StatsSection from "@/components/StatsSection";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <StatsSection />
      <CtaSection />
      <Footer />
    </div>
  );
};

export default Index;
