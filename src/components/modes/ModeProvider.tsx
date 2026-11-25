/**
 * ModeProvider.tsx - Mode, Role & Mock Auth State Context (persisted to localStorage)
 * Structured around a clean MockAuthSession interface so Firebase / Supabase / NextAuth can drop in cleanly.
 */

import React, { useCallback, useState } from 'react';
import { login as legacyLogin, logout as legacyLogout } from '../../lib/authService.js';
import { getDefaultRouteFor, requiresStaffLogin } from '../../lib/permissions';
import { ModeContext } from './modeContext';
import type { AppMode, AppRole, MockAuthSession } from '../../lib/data/types';

const MODE_STORAGE_KEY = 'sanjeevani_active_mode_role_v1';

interface StoredModeState {
  mode: AppMode | null;
  role: AppRole | null;
  session: MockAuthSession | null;
}

function loadStoredState(): StoredModeState {
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY);
    if (!raw) return { mode: null, role: null, session: null };
    const parsed = JSON.parse(raw) as StoredModeState;
    return {
      mode: parsed.mode === 'home' || parsed.mode === 'hospital' ? parsed.mode : null,
      role: parsed.role || null,
      session: parsed.session || null,
    };
  } catch {
    return { mode: null, role: null, session: null };
  }
}

function persistState(next: StoredModeState): void {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StoredModeState>(loadStoredState);

  const selectMode = useCallback((mode: AppMode) => {
    setState((prev) => {
      const next: StoredModeState = {
        mode,
        role: prev.mode === mode ? prev.role : null,
        session: prev.mode === mode ? prev.session : null,
      };
      persistState(next);
      return next;
    });
  }, []);

  const selectRoleAndEnter = useCallback(
    (
      role: AppRole,
      options?: { name?: string; staffId?: string; specialty?: string }
    ): string => {
      const activeMode: AppMode = state.mode || 'home';
      const defaultNames: Record<AppRole, string> = {
        patient: 'Ramesh Kumar',
        caretaker: 'Aarav Kumar',
        doctor: 'Dr. Anjali Sharma, MD',
        nurse: 'Nurse Kavita Rao',
      };

      const needsStaff = requiresStaffLogin(activeMode, role);
      const session: MockAuthSession = {
        userId: `u-${role}-${Date.now()}`,
        name: options?.name?.trim() || defaultNames[role],
        mode: activeMode,
        role,
        staffId: options?.staffId,
        specialty: options?.specialty,
        authenticated: needsStaff ? Boolean(options?.staffId) : true,
        signedInAt: new Date().toISOString(),
      };

      const nextState: StoredModeState = {
        mode: activeMode,
        role,
        session,
      };
      setState(nextState);
      persistState(nextState);

      // Sync with existing Navbar authService badge cleanly
      try {
        legacyLogin({
          id: session.userId,
          role: role === 'nurse' || role === 'caretaker' ? 'caregiver' : role,
          name: session.name,
          badge: `${activeMode === 'home' ? 'Home' : 'Hospital'} · ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          redirectPath: getDefaultRouteFor(activeMode, role),
        });
      } catch {
        // non-blocking
      }

      return getDefaultRouteFor(activeMode, role);
    },
    [state.mode]
  );

  const switchModeOrRole = useCallback(() => {
    const reset: StoredModeState = { mode: null, role: null, session: null };
    setState(reset);
    persistState(reset);
  }, []);

  const signOut = useCallback(() => {
    const reset: StoredModeState = { mode: null, role: null, session: null };
    setState(reset);
    persistState(reset);
    try {
      legacyLogout();
    } catch {
      // ignore
    }
  }, []);

  return (
    <ModeContext.Provider
      value={{
        mode: state.mode,
        role: state.role,
        session: state.session,
        selectMode,
        selectRoleAndEnter,
        switchModeOrRole,
        signOut,
      }}
    >
      {children}
    </ModeContext.Provider>
  );
};
