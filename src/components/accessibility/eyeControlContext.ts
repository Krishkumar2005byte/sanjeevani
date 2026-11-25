import { createContext, useContext } from 'react';

export type TremorTolerance = 'standard' | 'high' | 'max';

export interface EyeControlContextValue {
  enabled: boolean;
  eyeEnabled: boolean;
  handEnabled: boolean;
  paused: boolean;
  consentGranted: boolean;
  tremorTolerance: TremorTolerance;
  setTremorTolerance: (t: TremorTolerance) => void;
  requestEnable: (mode?: 'eye' | 'hand' | 'both') => void;
  toggleEye: () => void;
  toggleHand: () => void;
  disable: () => void;
  togglePaused: () => void;
  openCalibration: () => void;
  openSettings: () => void;
  openKeyboard: (target?: HTMLInputElement | HTMLTextAreaElement | null) => void;
  openAgent: () => void;
  triggerSosCountdown: (source?: string) => void;
}

export const EyeControlContext = createContext<EyeControlContextValue | null>(null);

export function useEyeControl(): EyeControlContextValue {
  const ctx = useContext(EyeControlContext);
  if (!ctx) {
    throw new Error('useEyeControl must be used inside <EyeControlProvider>');
  }
  return ctx;
}
