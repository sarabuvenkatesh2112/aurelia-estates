import { ExperienceProvider } from '@/components/layout/experience-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ExperiencePanels } from '@/components/layout/experience-panels';
import { MotionEngine } from '@/components/animation/motion-engine';
import { Hero } from '@/components/sections/hero';
import { Residences } from '@/components/sections/residences';
import { SignatureStory } from '@/components/sections/signature-story';
import {
  Introduction,
  Developments,
  Statistics,
  Locations,
  Lifestyle,
  Testimonials,
  Journal,
  AssistantTeaser,
  Contact,
} from '@/components/sections/editorial-sections';
export default function Home() {
  return (
    <ExperienceProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main-content">
        <Hero />
        <Residences />
        <Introduction />
        <SignatureStory />
        <Developments />
        <Statistics />
        <Locations />
        <Lifestyle />
        <Testimonials />
        <Journal />
        <AssistantTeaser />
        <Contact />
      </main>
      <Footer />
      <ExperiencePanels />
      <MotionEngine />
    </ExperienceProvider>
  );
}
