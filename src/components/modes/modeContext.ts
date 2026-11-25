import { createContext, useContext } from 'react';
import type { AppMode, AppRole, MockAuthSession } from '../../lib/data/types';

export interface ModeContextValue {
  mode: AppMode | null;
  role: AppRole | null;
  session: MockAuthSession | null;
  selectMode: (mode: AppMode) => void;
  selectRoleAndEnter: (role: AppRole, options?: { name?: string; staffId?: string; specialty?: string }) => string;
  switchModeOrRole: () => void;
  signOut: () => void;
}

export const ModeContext = createContext<ModeContextValue | null>(null);

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error('useMode must be used inside <ModeProvider>');
  }
  return ctx;
}
