/**
 * EyeControlProvider.tsx - Unified Patient Accessibility Controller (Part D Eye + Part E Hand Gestures + SOS Countdown)
 * Reuses useInputManager (single shared webcam stream for Eye + Hand) without duplicating tracking logic!
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Hand,
  Pause,
  Play,
  Sliders,
  Crosshair,
  Keyboard,
  Bot,
  ChevronUp,
  ChevronDown,
  AlertOctagon,
  ShieldCheck,
  AlertTriangle,
  ThumbsUp,
} from 'lucide-react';
import { useInputManager } from '../../hooks/useInputManager';
import {
  EYE_SETTINGS_STORAGE_KEY,
  clearCalibration,
  loadSavedCalibration,
  saveCalibration,
} from '../../lib/eyeCalibration';
import {
  getStoreSnapshot,
  sendCheckInOk,
  subscribeToStore,
} from '../../lib/data/sanjeevaniStore';
import { speak } from '../../lib/speech.js';
import { DEFAULT_EYE_SETTINGS } from '../../types/eyeControl';
import type { CalibrationModel, EyeSettings } from '../../types/eyeControl';
import type { AppMode, EmergencyContact } from '../../lib/data/types';
import { EyeControlContext } from './eyeControlContext';
import type { EyeControlContextValue, TremorTolerance } from './eyeControlContext';
import { GazeCursor } from './GazeCursor';
import { CalibrationScreen } from './CalibrationScreen';
import { GazeKeyboard } from './GazeKeyboard';
import { EyeControlSettings } from './EyeControlSettings';
import { EyeAgentPanel } from './EyeAgentPanel';
import { SosCountdownOverlay } from '../emergency/SosCountdownOverlay';

const SNAP_RADIUS_PX = 80;
const SOS_DWELL_MS = 2000;
const EDGE_SCROLL_ZONE = 0.085;

function loadSettings(): EyeSettings {
  try {
    const raw = localStorage.getItem(EYE_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_EYE_SETTINGS;
    return { ...DEFAULT_EYE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_EYE_SETTINGS;
  }
}

function getInteractiveElements(): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[role="button"]:not([aria-disabled="true"])',
    '.symptom-card',
    '.doctor-card',
    '.medicine-card',
    '[data-eye-target="true"]',
  ].join(',');

  const all = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  return all.filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;
    if (rect.bottom < -40 || rect.top > vh + 40 || rect.right < -40 || rect.left > vw + 40) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    return true;
  });
}

function distanceToRect(px: number, py: number, rect: DOMRect): number {
  const dx = Math.max(rect.left - px, 0, px - rect.right);
  const dy = Math.max(rect.top - py, 0, py - rect.bottom);
  return Math.hypot(dx, dy);
}

export const EyeControlProvider: React.FC<{
  children: React.ReactNode;
  mode?: AppMode;
}> = ({ children, mode = 'home' }) => {
  const [eyeEnabled, setEyeEnabled] = useState(false);
  const [handEnabled, setHandEnabled] = useState(false);
  const [pendingStartMode, setPendingStartMode] = useState<'eye' | 'hand' | 'both'>('eye');

  const enabled = eyeEnabled || handEnabled;

  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [activeInputEl, setActiveInputEl] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const [sosCountdownOpen, setSosCountdownOpen] = useState(false);
  const [sosTriggerSource, setSosTriggerSource] = useState('Patient SOS Button');
  const [checkInToast, setCheckInToast] = useState<string | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => getStoreSnapshot().contacts);

  const [settings, setSettings] = useState<EyeSettings>(loadSettings);
  const [tremorTolerance, setTremorTolerance] = useState<TremorTolerance>('high');
  const [calibration, setCalibration] = useState<CalibrationModel | null>(loadSavedCalibration);

  useEffect(() => {
    return subscribeToStore((state) => {
      setContacts(state.contacts);
    });
  }, []);

  const handleSettingsChange = useCallback((next: EyeSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(EYE_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  // Scale targets globally to 64x64px+ whenever Eye OR Hand biometric mode is active
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute('data-eye-mode', 'true');
    } else {
      root.removeAttribute('data-eye-mode');
    }
    return () => root.removeAttribute('data-eye-mode');
  }, [enabled]);

  const [snappedElement, setSnappedElement] = useState<HTMLElement | null>(null);
  const [snappedRect, setSnappedRect] = useState<DOMRect | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  const snappedElementRef = useRef<HTMLElement | null>(null);
  const dwellStartTsRef = useRef<number>(0);
  const lastClickedElRef = useRef<{ el: HTMLElement | null; at: number }>({ el: null, at: 0 });
  const scanIndexRef = useRef(0);
  const edgeLookStartRef = useRef<{ dir: 'up' | 'down' | null; at: number }>({ dir: null, at: 0 });

  const settingsRef = useRef(settings);
  const pausedRef = useRef(paused);
  const calibrationOpenRef = useRef(calibrationOpen);

  useEffect(() => {
    settingsRef.current = settings;
    pausedRef.current = paused;
    calibrationOpenRef.current = calibrationOpen;
  }, [settings, paused, calibrationOpen]);

  const triggerSosCountdown = useCallback((source = 'SOS Button') => {
    setSosTriggerSource(source);
    setSosCountdownOpen(true);
  }, []);

  const activateTarget = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !document.contains(el)) return;

      if (el.dataset.eyeSos === 'true') {
        triggerSosCountdown('Biometric SOS Trigger');
        return;
      }

      if (
        (el instanceof HTMLInputElement &&
          el.type !== 'submit' &&
          el.type !== 'button' &&
          el.type !== 'checkbox' &&
          el.type !== 'radio') ||
        el instanceof HTMLTextAreaElement
      ) {
        el.focus();
        setActiveInputEl(el);
        setKeyboardOpen(true);
        return;
      }

      el.focus();
      el.click();
    },
    [triggerSosCountdown]
  );

  const handlePauseToggle = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      if (settingsRef.current.voiceFeedback) {
        try {
          speak(next ? 'Control paused.' : 'Control resumed.', 'en-IN');
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const handleThumbsUpOk = useCallback(() => {
    void sendCheckInOk(mode, 'good', "I'm okay (Thumbs-Up Gesture)");
    setCheckInToast(`Sent "I'm okay" check-in to ${mode === 'hospital' ? 'Nurse Station' : 'Caretaker'}!`);
    try {
      speak("I'm okay check-in sent.", 'en-IN');
    } catch {
      // ignore
    }
    window.setTimeout(() => setCheckInToast(null), 4000);
  }, [mode]);

  const {
    activeSource,
    cursorPoint,
    cameraActive,
    cameraError,
    eyeFeatures,
    eyeCondition,
    eyeModelReady,
    blinkStage,
    pauseHoldProgress,
    handCondition,
    activeHandGesture,
    fistSosProgress,
  } = useInputManager({
    eyeEnabled,
    handEnabled,
    consentGranted,
    paused,
    calibration,
    eyeSettings: settings,
    tremorTolerance,
    snappedTargetRef: snappedElementRef,
    onPauseToggle: handlePauseToggle,
    onSelectTarget: activateTarget,
    onThumbsUpOk: handleThumbsUpOk,
    onTriggerSos: triggerSosCountdown,
  });

  // Unified magnetic target snapping + optional dwell timer + auto edge-scroll
  useEffect(() => {
    if (!enabled || !consentGranted || paused || calibrationOpen || settings.scanningEnabled || !cursorPoint) {
      snappedElementRef.current = null;
      return;
    }

    const now = performance.now();

    if (settings.edgeScrollEnabled) {
      const vh = window.innerHeight || 720;
      const topLimit = vh * EDGE_SCROLL_ZONE;
      const bottomLimit = vh * (1 - EDGE_SCROLL_ZONE);
      let dir: 'up' | 'down' | null = null;
      if (cursorPoint.y <= topLimit) dir = 'up';
      else if (cursorPoint.y >= bottomLimit) dir = 'down';

      if (dir !== edgeLookStartRef.current.dir) {
        edgeLookStartRef.current = { dir, at: now };
      } else if (dir && now - edgeLookStartRef.current.at > 380) {
        window.scrollBy({ top: dir === 'up' ? -22 : 22, behavior: 'auto' });
      }
    }

    const effectiveSnapRadius = tremorTolerance === 'max' ? 110 : tremorTolerance === 'high' ? 95 : SNAP_RADIUS_PX;
    const candidates = getInteractiveElements();
    let bestEl: HTMLElement | null = null;
    let bestDist = effectiveSnapRadius;
    let bestRect: DOMRect | null = null;

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const d = distanceToRect(cursorPoint.x, cursorPoint.y, rect);
      if (d < bestDist) {
        bestDist = d;
        bestEl = el;
        bestRect = rect;
      }
    }

    const frameId = requestAnimationFrame(() => {
      if (bestEl !== snappedElementRef.current) {
        snappedElementRef.current = bestEl;
        setSnappedElement(bestEl);
        setSnappedRect(bestRect);
        dwellStartTsRef.current = now;
        setDwellProgress(0);
      } else if (bestEl && bestRect) {
        setSnappedRect(bestRect);
        if (settings.dwellEnabled) {
          const isSos = bestEl.dataset.eyeSos === 'true';
          const targetDwellMs = isSos ? SOS_DWELL_MS : settings.dwellTimeMs;
          const justClickedSame =
            lastClickedElRef.current.el === bestEl && now - lastClickedElRef.current.at < 1400;

          if (!justClickedSame) {
            const elapsed = now - dwellStartTsRef.current;
            const pct = Math.min(1, elapsed / targetDwellMs);
            setDwellProgress(pct);
            if (pct >= 1) {
              lastClickedElRef.current = { el: bestEl, at: now };
              dwellStartTsRef.current = now;
              setDwellProgress(0);
              activateTarget(bestEl);
            }
          } else {
            dwellStartTsRef.current = now;
            setDwellProgress(0);
          }
        } else {
          setDwellProgress(0);
        }
      } else {
        setDwellProgress(0);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [
    enabled,
    consentGranted,
    paused,
    calibrationOpen,
    settings.scanningEnabled,
    settings.dwellEnabled,
    settings.dwellTimeMs,
    settings.edgeScrollEnabled,
    tremorTolerance,
    cursorPoint,
    activateTarget,
  ]);

  // Scanning fallback mode
  useEffect(() => {
    if (!enabled || !consentGranted || paused || calibrationOpen || !settings.scanningEnabled) {
      return;
    }

    const advanceScan = () => {
      const candidates = getInteractiveElements();
      if (candidates.length === 0) return;
      const idx = scanIndexRef.current % candidates.length;
      const target = candidates[idx];
      scanIndexRef.current = idx + 1;
      snappedElementRef.current = target;
      setSnappedElement(target);
      setSnappedRect(target.getBoundingClientRect());
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    advanceScan();
    const timer = window.setInterval(advanceScan, settings.scanSpeedMs);
    return () => window.clearInterval(timer);
  }, [enabled, consentGranted, paused, calibrationOpen, settings.scanningEnabled, settings.scanSpeedMs]);

  const applyModeSelection = useCallback(
    (which: 'eye' | 'hand' | 'both') => {
      const wantEye = which === 'eye' || which === 'both';
      const wantHand = which === 'hand' || which === 'both';
      setEyeEnabled(wantEye);
      setHandEnabled(wantHand);
      setPaused(false);
      if (wantEye && !calibration) {
        setCalibrationOpen(true);
      }
    },
    [calibration]
  );

  const requestEnable = useCallback(
    (which: 'eye' | 'hand' | 'both' = 'eye') => {
      if (consentGranted) {
        applyModeSelection(which);
      } else {
        setPendingStartMode(which);
        setConsentModalOpen(true);
      }
    },
    [consentGranted, applyModeSelection]
  );

  const toggleEye = useCallback(() => {
    if (eyeEnabled) {
      setEyeEnabled(false);
    } else if (consentGranted) {
      setEyeEnabled(true);
      if (!calibration) setCalibrationOpen(true);
    } else {
      setPendingStartMode(handEnabled ? 'both' : 'eye');
      setConsentModalOpen(true);
    }
  }, [eyeEnabled, handEnabled, consentGranted, calibration]);

  const toggleHand = useCallback(() => {
    if (handEnabled) {
      setHandEnabled(false);
    } else if (consentGranted) {
      setHandEnabled(true);
    } else {
      setPendingStartMode(eyeEnabled ? 'both' : 'hand');
      setConsentModalOpen(true);
    }
  }, [eyeEnabled, handEnabled, consentGranted]);

  const confirmConsentAndStart = () => {
    setConsentGranted(true);
    setConsentModalOpen(false);
    applyModeSelection(pendingStartMode);
  };

  const disable = useCallback(() => {
    setEyeEnabled(false);
    setHandEnabled(false);
    setPaused(false);
    setCalibrationOpen(false);
    setKeyboardOpen(false);
    setSettingsOpen(false);
    setAgentOpen(false);
    setConsentModalOpen(false);
  }, []);

  const openKeyboard = useCallback((target?: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (target) setActiveInputEl(target);
    setKeyboardOpen(true);
  }, []);

  const contextValue: EyeControlContextValue = {
    enabled,
    eyeEnabled,
    handEnabled,
    paused,
    consentGranted,
    tremorTolerance,
    setTremorTolerance,
    requestEnable,
    toggleEye,
    toggleHand,
    disable,
    togglePaused: handlePauseToggle,
    openCalibration: () => setCalibrationOpen(true),
    openSettings: () => setSettingsOpen(true),
    openKeyboard,
    openAgent: () => setAgentOpen(true),
    triggerSosCountdown,
  };

  const activeStatusMessage = (() => {
    if (cameraError) return cameraError;
    if (paused) return 'Paused — Hold Open Palm (1s) / Both Eyes Closed (2s) or click Resume';
    if (handEnabled && handCondition === 'too_dark') return 'Too dark — turn on front room lighting';
    if (eyeEnabled && eyeCondition === 'too_dark') return 'Too dark — turn on front room lighting';
    if (eyeEnabled && eyeCondition === 'no_face') return 'Face not detected — center face in front of webcam';
    if (eyeEnabled && eyeCondition === 'move_closer') return 'Move closer — step nearer to webcam';
    if (handEnabled && handCondition === 'hand_not_detected' && !eyeEnabled) {
      return 'Hand not detected — show index finger or hand to camera';
    }
    return `Active (${activeSource === 'hand' ? 'Hand Tracking' : activeSource === 'eye' ? 'Eye Gaze' : 'Shared Camera Ready'}) · Single On-Device Stream`;
  })();

  const isInteractiveLoopActive = enabled && consentGranted && !paused && !calibrationOpen;
  const activeSnappedEl = isInteractiveLoopActive ? snappedElement : null;
  const activeSnappedRect = activeSnappedEl ? snappedRect : null;
  const activeDwellProgress = isInteractiveLoopActive && !settings.scanningEnabled ? dwellProgress : 0;
  const isEmergencyTarget = activeSnappedEl?.dataset.eyeSos === 'true';

  const cursorX =
    activeSnappedEl && activeSnappedRect
      ? activeSnappedRect.left + activeSnappedRect.width / 2
      : cursorPoint?.x ?? -100;

  const cursorY =
    activeSnappedEl && activeSnappedRect
      ? activeSnappedRect.top + activeSnappedRect.height / 2
      : cursorPoint?.y ?? -100;

  return (
    <EyeControlContext.Provider value={contextValue}>
      {children}

      {/* On-Device Camera Consent Modal */}
      {consentModalOpen && (
        <div
          className="eye-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Camera Accessibility Privacy Consent"
        >
          <div className="eye-modal-card eye-consent-card">
            <div className="eye-modal-header">
              <div className="eye-modal-title">
                <ShieldCheck className="w-7 h-7 text-emerald-800" />
                <h2>Enable Hands-Free Eye &amp; Hand Control?</h2>
              </div>
            </div>
            <p className="eye-consent-desc">
              Sanjeevani processes webcam video strictly <strong>on-device</strong> using local MediaPipe Face &amp; Hand Landmarkers on a single shared stream.
            </p>
            <ul className="eye-consent-list">
              <li>Zero video frames are ever stored or uploaded.</li>
              <li><strong>Eye Mode:</strong> Look at any target and <strong>blink twice</strong> to click (close both eyes 2s to pause).</li>
              <li><strong>Hand Mode:</strong> Index finger moves cursor, <strong>Pinch</strong> selects, <strong>Open Palm (1s)</strong> pauses, <strong>Thumbs Up</strong> sends &ldquo;I&rsquo;m okay&rdquo;, <strong>Closed Fist (2s)</strong> starts SOS.</li>
              <li>Normal mouse, touch, and keyboard always remain active.</li>
            </ul>
            <div className="eye-modal-footer">
              <button
                type="button"
                className="eye-ctrl-btn primary"
                onClick={confirmConsentAndStart}
              >
                <Eye className="w-5 h-5" />
                <span>I Consent — Start Camera Control</span>
              </button>
              <button
                type="button"
                className="eye-ctrl-btn"
                onClick={() => setConsentModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active HUD Bar & Gestures Legend */}
      {enabled && (
        <>
          <div className="eye-hud-bar" role="region" aria-label="Biometric Accessibility Controls">
            <div className="eye-hud-status" aria-live="polite">
              <span className={`eye-cam-dot ${cameraActive && !paused ? 'live' : ''}`} />
              <span>{activeStatusMessage}</span>

              {blinkStage === 1 && (
                <span className="eye-blink-pill">Blink 1/2 — Blink once more to click!</span>
              )}
              {pauseHoldProgress > 0.05 && (
                <span className="eye-pause-progress">
                  Pause hold ({Math.round(pauseHoldProgress * 100)}%)
                </span>
              )}
              {fistSosProgress > 0.05 && (
                <span className="eye-blink-pill" style={{ background: '#DC2626' }}>
                  Fist SOS ({Math.round(fistSosProgress * 100)}%)
                </span>
              )}
            </div>

            <div className="eye-hud-actions">
              <button
                type="button"
                className={`eye-hud-btn ${eyeEnabled ? 'agent' : ''}`}
                onClick={toggleEye}
                aria-pressed={eyeEnabled}
              >
                <Eye className="w-5 h-5" />
                <span>Eye {eyeEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                className={`eye-hud-btn ${handEnabled ? 'agent' : ''}`}
                onClick={toggleHand}
                aria-pressed={handEnabled}
              >
                <Hand className="w-5 h-5" />
                <span>Hand {handEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                className={`eye-hud-btn ${paused ? 'warn' : ''}`}
                onClick={handlePauseToggle}
              >
                {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                <span>{paused ? 'Resume' : 'Pause'}</span>
              </button>

              {eyeEnabled && (
                <button
                  type="button"
                  className="eye-hud-btn"
                  onClick={() => {
                    clearCalibration();
                    setCalibration(null);
                    setCalibrationOpen(true);
                  }}
                >
                  <Crosshair className="w-5 h-5" />
                  <span>{calibration ? 'Recalibrate' : 'Calibrate'}</span>
                </button>
              )}

              <button type="button" className="eye-hud-btn" onClick={() => setKeyboardOpen((k) => !k)}>
                <Keyboard className="w-5 h-5" />
                <span>Keyboard</span>
              </button>

              <button
                type="button"
                className="eye-hud-btn agent"
                onClick={() => setAgentOpen(true)}
                data-eye-agent="true"
              >
                <Bot className="w-5 h-5" />
                <span>Talk to Agent</span>
              </button>

              <button type="button" className="eye-hud-btn" onClick={() => setSettingsOpen(true)}>
                <Sliders className="w-5 h-5" />
                <span>Settings</span>
              </button>

              <button type="button" className="eye-hud-btn exit" onClick={disable}>
                <EyeOff className="w-5 h-5" />
                <span>Exit</span>
              </button>
            </div>

            {/* Hand Gesture Quick Legend Bar when Hand Mode is active */}
            {handEnabled && (
              <div className="w-full flex flex-wrap items-center gap-2 pt-2 border-t border-white/15 text-xs font-semibold text-white/90">
                <span className="px-2.5 py-1 rounded-full bg-white/15">Index Point = Move</span>
                <span className="px-2.5 py-1 rounded-full bg-white/15">Pinch = Click</span>
                <span className="px-2.5 py-1 rounded-full bg-white/15">Open Palm 1s = Pause</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-700/80">Thumbs Up = &ldquo;I&rsquo;m okay&rdquo;</span>
                <span className="px-2.5 py-1 rounded-full bg-red-700/90">Closed Fist 2s = SOS</span>
                {activeHandGesture !== 'none' && (
                  <span className="ml-auto px-3 py-1 rounded-full bg-amber-300 text-black font-extrabold">
                    Detected: {activeHandGesture.replace('_', ' ')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Check-in Toast Notification */}
          {checkInToast && (
            <div className="fixed top-28 right-4 z-[9400] bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2 border-2 border-emerald-300">
              <ThumbsUp className="w-5 h-5" />
              <span>{checkInToast}</span>
            </div>
          )}

          {/* Dedicated Gaze/Hand Scroll Buttons */}
          <div className="eye-scroll-dock" aria-label="Scroll Controls">
            <button
              type="button"
              className="eye-scroll-btn"
              onClick={() => window.scrollBy({ top: -320, behavior: 'smooth' })}
              aria-label="Scroll Up"
            >
              <ChevronUp className="w-6 h-6" />
              <span>Scroll Up</span>
            </button>
            <button
              type="button"
              className="eye-scroll-btn"
              onClick={() => window.scrollBy({ top: 320, behavior: 'smooth' })}
              aria-label="Scroll Down"
            >
              <ChevronDown className="w-6 h-6" />
              <span>Scroll Down</span>
            </button>
          </div>
        </>
      )}

      {/* Always-Visible Large Emergency SOS Button on Patient Views (works even if camera/AI fails) */}
      <button
        type="button"
        className="eye-sos-fab"
        data-eye-sos="true"
        onClick={() => triggerSosCountdown('Fixed Corner SOS Button')}
        aria-label="Trigger Emergency SOS Countdown"
      >
        <AlertOctagon className="w-7 h-7" />
        <div className="eye-sos-text">
          <strong>SOS</strong>
          <small>{enabled ? (handEnabled ? 'Fist 2s / Blink 2x' : 'Blink 2x / Dwell') : 'Tap Help'}</small>
        </div>
      </button>

      {/* Modals & Overlays */}
      {enabled && calibrationOpen && (
        <CalibrationScreen
          features={eyeFeatures}
          modelReady={eyeModelReady}
          onComplete={(model) => {
            saveCalibration(model);
            setCalibration(model);
            setCalibrationOpen(false);
            if (settings.voiceFeedback) {
              try {
                speak('Calibration saved.', 'en-IN');
              } catch {
                // ignore
              }
            }
          }}
          onCancel={() => setCalibrationOpen(false)}
        />
      )}

      {enabled && (
        <>
          <EyeControlSettings
            visible={settingsOpen}
            settings={settings}
            onChange={handleSettingsChange}
            onRecalibrate={() => setCalibrationOpen(true)}
            onClose={() => setSettingsOpen(false)}
          />

          <GazeKeyboard
            visible={keyboardOpen}
            targetElement={activeInputEl}
            onClose={() => setKeyboardOpen(false)}
          />

          <EyeAgentPanel
            visible={agentOpen}
            onClose={() => setAgentOpen(false)}
            onFocusInput={(el) => openKeyboard(el)}
          />

          <GazeCursor
            visible={
              !calibrationOpen &&
              (cursorPoint !== null || (settings.scanningEnabled && activeSnappedRect !== null))
            }
            x={cursorX}
            y={cursorY}
            sizePx={settings.cursorSizePx}
            dwellProgress={activeDwellProgress}
            blinkStage={blinkStage}
            doubleBlinkMode={Boolean(eyeEnabled && settings.blinkEnabled && settings.doubleBlinkEnabled)}
            isSnapped={Boolean(activeSnappedEl && activeSnappedRect)}
            snappedRect={activeSnappedRect}
            paused={paused}
            isEmergencyTarget={isEmergencyTarget}
          />
        </>
      )}

      {/* Part E Full-Screen 5s SOS Countdown */}
      {sosCountdownOpen && (
        <SosCountdownOverlay
          visible
          mode={mode}
          triggerSource={sosTriggerSource}
          contacts={contacts}
          onClose={() => setSosCountdownOpen(false)}
        />
      )}

      {/* Fallback Warning icon reference used when cameraError exists cleanly */}
      {cameraError && enabled && (
        <div className="sr-only" role="alert">
          <AlertTriangle className="w-4 h-4" />
          <span>{cameraError}</span>
        </div>
      )}
    </EyeControlContext.Provider>
  );
};
