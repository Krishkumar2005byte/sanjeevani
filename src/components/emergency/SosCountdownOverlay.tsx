/**
 * SosCountdownOverlay.tsx - Full-Screen "Calling Emergency in 5... Cancel" Countdown
 * Triggered by 2s Dwell, 2s Fist Hold, Double-Blink, or Direct Tap.
 * Speaks audible alert via Web Speech API and dispatches real-time emergency alert to Caretaker/Nurse.
 */

import React, { useEffect, useRef, useState } from 'react';
import { PhoneCall, AlertOctagon, XCircle } from 'lucide-react';
import { getContactsForMode, triggerSosAlert } from '../../lib/data/sanjeevaniStore';
import { speak } from '../../lib/speech.js';
import type { AppMode, EmergencyContact } from '../../lib/data/types';

export interface SosCountdownOverlayProps {
  visible: boolean;
  mode: AppMode;
  triggerSource: string;
  contacts: EmergencyContact[];
  onClose: () => void;
}

export const SosCountdownOverlay: React.FC<SosCountdownOverlayProps> = ({
  visible,
  mode,
  triggerSource,
  contacts,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [dispatched, setDispatched] = useState(false);
  const firedRef = useRef(false);

  const finalizeDispatch = async () => {
    if (firedRef.current) return;
    firedRef.current = true;
    setDispatched(true);
    await triggerSosAlert(mode, triggerSource);
    try {
      speak(
        mode === 'hospital'
          ? 'Emergency alert sent to Nursing Station and attending doctor. Tap a number to call directly.'
          : 'Emergency alert sent to family caretaker. Tap 108 or family below to call directly.',
        'en-IN'
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    try {
      speak('Calling emergency in 5 seconds. Press Cancel to stop.', 'en-IN');
    } catch {
      // ignore
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void finalizeDispatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode]);

  if (!visible) return null;

  const prioritizedContacts = getContactsForMode(contacts, mode).slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-[9700] bg-red-950/95 text-white flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto"
      role="alertdialog"
      aria-modal="true"
      aria-label="Emergency SOS Countdown"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-red-900/80 border-4 border-amber-300 p-6 sm:p-10 text-center shadow-2xl">
        <AlertOctagon className="w-16 h-16 text-amber-300 mx-auto mb-3" />

        {!dispatched ? (
          <>
            <p className="text-sm uppercase tracking-widest font-bold text-amber-200">
              Trigger: {triggerSource}
            </p>
            <h1 className="mt-2 text-[clamp(1.8rem,4vw,3rem)] font-extrabold">
              Calling emergency in {secondsLeft}...
            </h1>
            <p className="mt-2 text-lg text-red-100">
              {mode === 'hospital'
                ? 'Notifying Nurse Station, Doctor & emergency ambulance'
                : 'Alerting Family Caretaker & emergency response'}
            </p>

            {/* Huge Accessible Cancel Button */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[96px] px-10 py-5 rounded-2xl bg-white text-red-900 font-extrabold text-2xl inline-flex items-center justify-center gap-3 shadow-xl hover:bg-amber-100 cursor-pointer"
              >
                <XCircle className="w-9 h-9" />
                <span>CANCEL SOS</span>
              </button>

              <button
                type="button"
                onClick={() => void finalizeDispatch()}
                className="w-full sm:w-auto min-h-[76px] px-6 py-4 rounded-2xl bg-red-700 border-2 border-white text-white font-bold text-lg inline-flex items-center justify-center gap-2 hover:bg-red-600 cursor-pointer"
              >
                <PhoneCall className="w-6 h-6" />
                <span>Alert Now</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-extrabold text-amber-300">
              EMERGENCY ALERT SENT
            </h1>
            <p className="mt-2 text-base sm:text-lg text-white">
              {mode === 'hospital'
                ? 'Nurse Station & attending doctor have been notified immediately.'
                : 'Caregiver feed updated with high-priority SOS beacon.'}
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {prioritizedContacts.map((c) => (
                <a
                  key={c.id}
                  href={`tel:${c.phone.replace(/\s+/g, '')}`}
                  className="min-h-[68px] p-4 rounded-2xl bg-white text-red-900 font-bold flex items-center justify-between gap-3 hover:bg-amber-100"
                >
                  <div>
                    <div className="text-base font-extrabold">{c.name}</div>
                    <div className="text-xs text-red-700">{c.relationOrRole}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white text-sm">
                    <PhoneCall className="w-4 h-4" />
                    {c.phone}
                  </span>
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-[64px] px-8 py-3 rounded-2xl bg-white/15 border-2 border-white text-white font-bold text-lg"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};
