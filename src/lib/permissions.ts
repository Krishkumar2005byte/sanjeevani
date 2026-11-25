/**
 * permissions.ts - Centralized Role & Mode Permissions Matrix + Route Guard Rules
 */

import type { AppMode, AppRole } from './data/types';

export interface RouteDefinition {
  path: string;
  mode: AppMode;
  role: AppRole;
  requiresStaffAuth: boolean;
}

export const MODE_ROLE_ROUTES: Record<string, RouteDefinition> = {
  '/home/patient': {
    path: '/home/patient',
    mode: 'home',
    role: 'patient',
    requiresStaffAuth: false,
  },
  '/home/caretaker': {
    path: '/home/caretaker',
    mode: 'home',
    role: 'caretaker',
    requiresStaffAuth: false,
  },
  '/hospital/patient': {
    path: '/hospital/patient',
    mode: 'hospital',
    role: 'patient',
    requiresStaffAuth: false,
  },
  '/hospital/doctor': {
    path: '/hospital/doctor',
    mode: 'hospital',
    role: 'doctor',
    requiresStaffAuth: true,
  },
  '/hospital/nurse': {
    path: '/hospital/nurse',
    mode: 'hospital',
    role: 'nurse',
    requiresStaffAuth: true,
  },
};

export function getAllowedRolesForMode(mode: AppMode): AppRole[] {
  return mode === 'home' ? ['patient', 'caretaker'] : ['patient', 'doctor', 'nurse'];
}

export function getDefaultRouteFor(mode: AppMode | null, role: AppRole | null): string {
  if (!mode || !role) return '/';
  if (mode === 'home') {
    return role === 'caretaker' ? '/home/caretaker' : '/home/patient';
  }
  if (role === 'doctor') return '/hospital/doctor';
  if (role === 'nurse') return '/hospital/nurse';
  return '/hospital/patient';
}

export function requiresStaffLogin(mode: AppMode, role: AppRole): boolean {
  return mode === 'hospital' && (role === 'doctor' || role === 'nurse');
}

export function canAccessRoute(
  activeMode: AppMode | null,
  activeRole: AppRole | null,
  staffAuthenticated: boolean,
  targetPath: string
): { allowed: boolean; reason?: 'no_selection' | 'wrong_role_or_mode' | 'staff_auth_required' } {
  const def = MODE_ROLE_ROUTES[targetPath];
  if (!def) return { allowed: true };

  if (!activeMode || !activeRole) {
    return { allowed: false, reason: 'no_selection' };
  }

  if (activeMode !== def.mode || activeRole !== def.role) {
    return { allowed: false, reason: 'wrong_role_or_mode' };
  }

  if (def.requiresStaffAuth && !staffAuthenticated) {
    return { allowed: false, reason: 'staff_auth_required' };
  }

  return { allowed: true };
}

/** Emergency contacts can ONLY be added/edited by Caretaker (Home) or Nurse (Hospital); strictly read-only for Patient */
export function canEditEmergencyContacts(mode: AppMode | null, role: AppRole | null): boolean {
  if (!mode || !role) return false;
  if (mode === 'home' && role === 'caretaker') return true;
  if (mode === 'hospital' && role === 'nurse') return true;
  return false;
}

export function canResolveAlerts(role: AppRole | null): boolean {
  return role === 'caretaker' || role === 'nurse' || role === 'doctor';
}

export function canEditClinicalNotesAndRx(mode: AppMode | null, role: AppRole | null): boolean {
  return mode === 'hospital' && role === 'doctor';
}
