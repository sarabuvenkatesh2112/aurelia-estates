'use client';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
const Preference = createContext({
  reduced: false,
  system: false,
  toggle: () => {},
});
export const useMotionPreference = () => useContext(Preference);
export function MotionPreference({ children }: { children: ReactNode }) {
  const system = !!useReducedMotion();
  const [manual, setManual] = useState(false);
  const reduced = system || manual;
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute('data-reduced-motion', reduced);
    return () =>
      document.documentElement.removeAttribute('data-reduced-motion');
  }, [reduced]);
  return (
    <Preference.Provider
      value={{ reduced, system, toggle: () => setManual((value) => !value) }}
    >
      <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
        {children}
      </MotionConfig>
    </Preference.Provider>
  );
}
