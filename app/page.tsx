import { ExperienceProvider } from '@/components/layout/experience-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ExperiencePanels } from '@/components/layout/experience-panels';
import { MotionEngine } from '@/components/animation/motion-engine';
import { ArchitectureJourney } from '@/components/sections/architecture-journey';
import { Hero } from '@/components/sections/hero';
import { Residences } from '@/components/sections/residences';
import { SignatureStory } from '@/components/sections/signature-story';
import { homepageCollection } from '@/lib/services/projectService';
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
export const dynamic = 'force-dynamic';
export const metadata = { alternates: { canonical: '/' } };
export default async function Home() {
  const collection = await homepageCollection().catch(() => ({
    properties: [],
  }));
  return (
    <ExperienceProvider properties={collection.properties}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main-content">
        <Hero />
        <ArchitectureJourney />
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
