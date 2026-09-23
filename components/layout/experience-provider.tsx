'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { LayoutGroup } from 'motion/react';
import { MotionPreference } from '@/components/animation/motion-preference';
import type { Property } from '@/types/property';
import { emitEvent } from '@/lib/events';
export type Panel =
  | { kind: 'property'; property: Property }
  | { kind: 'visit'; property?: Property; advisor?: boolean; unitId?: string }
  | { kind: 'assistant' }
  | { kind: 'info'; title: string; text: string }
  | null;
const ExperienceContext = createContext<{
  panel: Panel;
  properties: Property[];
  isOpen: boolean;
  finishClose: () => void;
  open: (panel: Panel) => void;
}>({
  panel: null,
  properties: [],
  isOpen: false,
  finishClose: () => {},
  open: () => {},
});
export const useExperience = () => useContext(ExperienceContext);
export function ExperienceProvider({
  children,
  properties = [],
}: {
  children: ReactNode;
  properties?: Property[];
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [isOpen, setIsOpen] = useState(false);
  const open = (next: Panel) => {
    if (next?.kind === 'visit' && !next.advisor)
      emitEvent('SCHEDULE_VISIT_STARTED', {
        projectId: next.property?.id,
        unitId: next.unitId,
      });
    if (next?.kind === 'assistant') emitEvent('AI_ASSISTANT_OPENED');
    if (next) setPanel(next);
    setIsOpen(next !== null);
  };
  const finishClose = () => {
    if (!isOpen) setPanel(null);
  };
  return (
    <MotionPreference>
      <LayoutGroup id="residence-transition">
        <ExperienceContext.Provider
          value={{ panel, properties, isOpen, open, finishClose }}
        >
          {children}
          {!isOpen && (
            <button
              className="concierge-launcher"
              onClick={() => open({ kind: 'assistant' })}
              aria-label="Open Aurelia AI concierge"
            >
              AI <span>Aurelia</span>
            </button>
          )}
        </ExperienceContext.Provider>
      </LayoutGroup>
    </MotionPreference>
  );
}
