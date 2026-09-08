'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { MotionConfig, LayoutGroup } from 'motion/react';
import type { Property } from '@/types/property';
export type Panel =
  | { kind: 'property'; property: Property }
  | { kind: 'visit'; property?: Property; advisor?: boolean }
  | { kind: 'assistant' }
  | { kind: 'info'; title: string; text: string }
  | null;
const ExperienceContext = createContext<{
  panel: Panel;
  open: (panel: Panel) => void;
}>({ panel: null, open: () => {} });
export const useExperience = () => useContext(ExperienceContext);
export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [panel, open] = useState<Panel>(null);
  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="residence-transition">
        <ExperienceContext.Provider value={{ panel, open }}>
          {children}
        </ExperienceContext.Provider>
      </LayoutGroup>
    </MotionConfig>
  );
}
