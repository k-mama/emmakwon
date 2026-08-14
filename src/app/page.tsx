import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HomeHouse from "@/components/HomeHouse";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HomeHouse />
      </main>
      <Footer />
    </>
  );
}
