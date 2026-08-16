import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HomeHouse from "@/components/HomeHouse";
import Contact from "@/components/home/Contact";
import StudioMethod from "@/components/home/StudioMethod";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Emma Kwon",
  description:
    "Emma Kwon — books, music, character worlds, children's creative work, and the Studio behind them.",
  path: "/",
  image: "/media/surf-ai-poster.webp",
  imageAlt: "Emma Kwon creative house hero image.",
});

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
