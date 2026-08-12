import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProofFirst from "@/components/home/ProofFirst";
import TheQuestion from "@/components/home/TheQuestion";
import InsideTheStudio from "@/components/home/InsideTheStudio";
import TheHouse from "@/components/home/TheHouse";
import WatchMeBuild from "@/components/home/WatchMeBuild";
import StudioNotes from "@/components/home/StudioNotes";
import CurrentlyMaking from "@/components/home/CurrentlyMaking";
import Emma from "@/components/home/Emma";
import FinalDoor from "@/components/home/FinalDoor";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <ProofFirst />
      <TheQuestion />
      <InsideTheStudio />
      <TheHouse />
      <WatchMeBuild />
      <StudioNotes />
      <CurrentlyMaking />
      <Emma />
      <FinalDoor />
    </main>
  );
}
