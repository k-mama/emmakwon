import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import BrandStatement from "@/components/home/BrandStatement";
import CuratedWorlds from "@/components/home/CuratedWorlds";
import StudioMethod from "@/components/home/StudioMethod";
import Contact from "@/components/home/Contact";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <BrandStatement />
      <CuratedWorlds />
      <StudioMethod />
      <Contact />
      <Footer />
    </main>
  );
}
