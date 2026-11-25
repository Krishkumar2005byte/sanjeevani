/**
 * ModePickerScreen.tsx - Very first full-screen Entry Flow ("Choose your mode")
 * Supports Home Mode & Hospital Mode using LiquidButton & lucide-react icons.
 * Large >=64px tap targets designed to work seamlessly with eye control, hand gestures, mouse, touch, and keyboard.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Hospital, ArrowRight, ShieldCheck, Eye, Hand } from 'lucide-react';
import { LiquidButton } from '../ui/liquid-glass-button';
import { useMode } from './modeContext';
import type { AppMode } from '../../lib/data/types';

export const ModePickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { mode, role, selectMode } = useMode();

  const handleChoose = (chosen: AppMode) => {
    selectMode(chosen);
    navigate('/select-role');
  };

  return (
    <section
      className="min-h-dvh w-full bg-gradient-to-br from-[#F3F5F3] via-[#EAF3ED] to-[#DDE9E1] flex flex-col justify-center py-8 sm:py-12"
      aria-labelledby="entry-mode-heading"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#134E32]/10 text-[#134E32] font-bold text-sm mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Sanjeevani Accessibility Care Platform</span>
          </span>

          <h1
            id="entry-mode-heading"
            className="text-[clamp(1.85rem,4.5vw,3.5rem)] font-bold tracking-tight text-[#161B18] leading-tight"
          >
            Choose your care mode
          </h1>

          <p className="mt-3 text-[clamp(1rem,1.5vw,1.25rem)] text-[#4F5B54] leading-relaxed">
            Select Home Care for family &amp; elder assistance, or Hospital Care for bedside nurse calls and clinical monitoring.
          </p>

          {mode && role && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate(`/${mode}/${role === 'caretaker' ? 'caretaker' : role}`)}
                className="min-h-[48px] px-5 py-2 rounded-full bg-white border-2 border-[#134E32] text-[#134E32] font-bold text-sm hover:bg-[#EAF3ED] transition"
              >
                Resume active session ({mode} · {role}) →
              </button>
            </div>
          )}
        </div>

        {/* Two Large Fluid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {/* Home Mode Card */}
          <div className="group relative rounded-3xl bg-gradient-to-br from-[#0E3D27] via-[#134E32] to-[#1D6A46] p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between min-h-[280px] border border-white/15">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-5 border border-white/20">
                <Home className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-[clamp(1.4rem,2.4vw,2rem)] font-bold">Home Mode</h2>
              <p className="mt-2 text-white/85 text-[clamp(0.98rem,1.3vw,1.12rem)] leading-relaxed">
                Simple large-button communication, &ldquo;I&rsquo;m okay&rdquo; check-ins, medicine reminders, and family emergency contacts.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-full bg-white/15">Patient / Elder</span>
                <span className="px-3 py-1 rounded-full bg-white/15">Caretaker / Family</span>
              </div>
            </div>

            <div className="mt-8">
              <LiquidButton
                type="button"
                size="xxl"
                className="text-white font-bold w-full sm:w-auto min-h-[64px] text-base"
                onClick={() => handleChoose('home')}
                aria-label="Choose Home Mode"
              >
                <span>Enter Home Mode</span>
                <ArrowRight className="w-5 h-5" />
              </LiquidButton>
            </div>
          </div>

          {/* Hospital Mode Card */}
          <div className="group relative rounded-3xl bg-gradient-to-br from-[#0B2E3C] via-[#114459] to-[#175B75] p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between min-h-[280px] border border-white/15">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-5 border border-white/20">
                <Hospital className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-[clamp(1.4rem,2.4vw,2rem)] font-bold">Hospital Mode</h2>
              <p className="mt-2 text-white/85 text-[clamp(0.98rem,1.3vw,1.12rem)] leading-relaxed">
                Bedside nurse call buttons, room &amp; bed alert queue, live clinical vitals, doctor prescriptions, and station SOS.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-full bg-white/15">Patient (Bedside)</span>
                <span className="px-3 py-1 rounded-full bg-white/15">Doctor</span>
                <span className="px-3 py-1 rounded-full bg-white/15">Nurse</span>
              </div>
            </div>

            <div className="mt-8">
              <LiquidButton
                type="button"
                size="xxl"
                className="text-white font-bold w-full sm:w-auto min-h-[64px] text-base"
                onClick={() => handleChoose('hospital')}
                aria-label="Choose Hospital Mode"
              >
                <span>Enter Hospital Mode</span>
                <ArrowRight className="w-5 h-5" />
              </LiquidButton>
            </div>
          </div>
        </div>

        {/* Accessibility Note */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-[#4F5B54]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Eye className="w-4 h-4 text-[#134E32]" />
            <span>Eye Control Ready on Patient Views</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Hand className="w-4 h-4 text-[#134E32]" />
            <span>Hand Gesture Navigation Supported</span>
          </span>
        </div>
      </div>
    </section>
  );
};
