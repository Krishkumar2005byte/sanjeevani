/**
 * PatientAccessibilityBanner.tsx - Prominent Eye + Hand Control Bar + First-Visit Prompt
 * Reused across both Home Patient and Hospital Patient views without duplicating logic.
 */

import React, { useState } from 'react';
import { Eye, Hand, Sparkles, Crosshair, X } from 'lucide-react';
import { useEyeControl } from '../accessibility/eyeControlContext';

const PROMPT_DISMISSED_KEY = 'sanjeevani_eye_first_visit_prompt_seen';

export const PatientAccessibilityBanner: React.FC = () => {
  const {
    enabled,
    eyeEnabled,
    handEnabled,
    requestEnable,
    toggleEye,
    toggleHand,
    openCalibration,
  } = useEyeControl();

  const [showSuggestion, setShowSuggestion] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PROMPT_DISMISSED_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const dismissPrompt = () => {
    setShowSuggestion(false);
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {/* First-visit Eye/Hand suggestion */}
      {showSuggestion && !enabled && (
        <div
          className="rounded-2xl bg-gradient-to-r from-[#0E3D27] to-[#1D6A46] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md"
          role="region"
          aria-label="Hands-free Accessibility Suggestion"
        >
          <div className="flex items-start gap-3 max-w-2xl">
            <Sparkles className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Hands-Free Control Available (Eye Gaze &amp; Hand Gestures)
              </h3>
              <p className="text-sm text-white/90 mt-0.5">
                Enable Eye Control (9-point calibration + double-blink select) or Hand Gesture Navigation (shared single camera, 100% on-device).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                dismissPrompt();
                requestEnable('eye');
              }}
              className="min-h-[56px] px-4 py-2.5 rounded-xl bg-white text-[#134E32] font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Enable Eye + Calibrate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                dismissPrompt();
                requestEnable('both');
              }}
              className="min-h-[56px] px-4 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Hand className="w-4 h-4" />
              <span>Eye + Hand</span>
            </button>
            <button
              type="button"
              onClick={dismissPrompt}
              className="min-h-[48px] min-w-[48px] p-2 rounded-xl bg-white/10 text-white inline-flex items-center justify-center"
              aria-label="Dismiss accessibility suggestion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Prominent Always-Available Patient Accessibility Toggles */}
      <div className="rounded-2xl bg-white border-2 border-[#E2E7E3] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#134E32]">
            Hands-Free Patient Input
          </span>
          <p className="text-sm text-[#4F5B54] m-0">
            Switch between Eye Gaze (blink 2x), Hand Gestures (pinch / palm / fist), or use both together.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleEye}
            className={`min-h-[64px] px-5 py-3 rounded-xl font-bold inline-flex items-center gap-2 border-2 transition cursor-pointer ${
              eyeEnabled
                ? 'bg-[#134E32] border-[#0E3D27] text-white'
                : 'bg-[#F7F9F7] border-[#CBD5E1] text-[#161B18]'
            }`}
            aria-pressed={eyeEnabled}
          >
            <Eye className="w-5 h-5" />
            <span>Eye Control: {eyeEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={toggleHand}
            className={`min-h-[64px] px-5 py-3 rounded-xl font-bold inline-flex items-center gap-2 border-2 transition cursor-pointer ${
              handEnabled
                ? 'bg-[#0F766E] border-[#115E59] text-white'
                : 'bg-[#F7F9F7] border-[#CBD5E1] text-[#161B18]'
            }`}
            aria-pressed={handEnabled}
          >
            <Hand className="w-5 h-5" />
            <span>Hand Gestures: {handEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {!eyeEnabled && !handEnabled ? (
            <button
              type="button"
              onClick={() => requestEnable('both')}
              className="min-h-[64px] px-5 py-3 rounded-xl font-bold inline-flex items-center gap-2 border-2 border-[#134E32] bg-[#EAF3ED] text-[#134E32] cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Enable Both</span>
            </button>
          ) : eyeEnabled ? (
            <button
              type="button"
              onClick={openCalibration}
              className="min-h-[64px] px-4 py-3 rounded-xl font-bold inline-flex items-center gap-2 border-2 border-[#134E32] bg-white text-[#134E32] cursor-pointer"
            >
              <Crosshair className="w-5 h-5" />
              <span>Calibrate Eyes</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
