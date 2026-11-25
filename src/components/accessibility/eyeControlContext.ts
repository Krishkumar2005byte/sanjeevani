import { createContext, useContext } from 'react';

export interface EyeControlContextValue {
  enabled: boolean;
  paused: boolean;
  consentGranted: boolean;
  requestEnable: () => void;
  disable: () => void;
  togglePaused: () => void;
  openCalibration: () => void;
  openSettings: () => void;
  openKeyboard: (target?: HTMLInputElement | HTMLTextAreaElement | null) => void;
  openAgent: () => void;
}

export const EyeControlContext = createContext<EyeControlContextValue | null>(null);

export function useEyeControl(): EyeControlContextValue {
  const ctx = useContext(EyeControlContext);
  if (!ctx) {
    throw new Error('useEyeControl must be used inside <EyeControlProvider>');
  }
  return ctx;
}
