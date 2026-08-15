import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HomeHouse from "@/components/HomeHouse";
import Contact from "@/components/home/Contact";
import StudioMethod from "@/components/home/StudioMethod";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HomeHouse />
        <StudioMethod />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
