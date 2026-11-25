/**
 * RoleRouteGuard.tsx - Prevents direct cross-role or unauthenticated route access
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';
import { canAccessRoute, getDefaultRouteFor } from '../../lib/permissions';
import { useMode } from './modeContext';

export const RoleRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode, role, session, switchModeOrRole } = useMode();
  const location = useLocation();
  const navigate = useNavigate();

  const staffAuthed = Boolean(session?.authenticated);
  const check = canAccessRoute(mode, role, staffAuthed, location.pathname);

  if (check.allowed) {
    return <>{children}</>;
  }

  return (
    <div
      className="min-h-[75dvh] w-full flex items-center justify-center p-4 bg-[#F3F5F3]"
      role="alertdialog"
      aria-labelledby="route-guard-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white border-2 border-[#DC2626] p-6 sm:p-8 shadow-lg text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 id="route-guard-title" className="text-2xl font-bold text-[#161B18]">
          {check.reason === 'staff_auth_required'
            ? 'Hospital Staff Login Required'
            : check.reason === 'wrong_role_or_mode'
              ? 'Role / Mode Access Restricted'
              : 'Select Care Mode First'}
        </h1>
        <p className="mt-2 text-[#4F5B54] text-base leading-relaxed">
          {check.reason === 'staff_auth_required'
            ? 'Doctor and Nurse portals require clinical verification. Please sign in through the Role Picker.'
            : check.reason === 'wrong_role_or_mode'
              ? `You are signed in as ${mode} (${role}). Direct access to another role’s workspace (${location.pathname}) is blocked.`
              : 'Please choose Home Mode or Hospital Mode before opening this dashboard.'}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {mode && role && check.reason === 'wrong_role_or_mode' && (
            <button
              type="button"
              onClick={() => navigate(getDefaultRouteFor(mode, role))}
              className="min-h-[56px] px-5 py-3 rounded-xl bg-[#134E32] text-white font-bold inline-flex items-center justify-center gap-2"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              switchModeOrRole();
              navigate('/');
            }}
            className="min-h-[56px] px-5 py-3 rounded-xl border-2 border-[#134E32] text-[#134E32] font-bold inline-flex items-center justify-center gap-2 bg-white"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Switch Mode / Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
