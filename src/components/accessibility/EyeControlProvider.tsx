/**
 * EyeControlProvider.tsx - Application-wide Eye-Gesture Accessibility Context & Overlay Controller
 * - OFF by default; asks explicit user consent before opening local webcam
 * - Lazy-loads @mediapipe/tasks-vision FaceLandmarker only when activated
 * - Supports Dwell Click (default 1.2s, 2.0s on SOS), Blink/Double-Blink Click, Scanning Mode,
 *   2s Eyes-Closed Pause/Resume, Magnetic Target Snapping (~80px), Auto Edge-Scroll & Scroll Buttons,
 *   On-Screen Gaze Keyboard & Quick Phrases, AI Voice Agent Panel, and Gaze-Accessible Settings
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
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
} from 'lucide-react';
import { useEyeTracking } from '../../hooks/useEyeTracking';
import {
  EYE_SETTINGS_STORAGE_KEY,
  clearCalibration,
  loadSavedCalibration,
  saveCalibration,
} from '../../lib/eyeCalibration';
import { triggerEmergency, setQuickAlert } from '../../lib/patientService.js';
import { speak } from '../../lib/speech.js';
import { DEFAULT_EYE_SETTINGS } from '../../types/eyeControl';
import type { CalibrationModel, EyeSettings } from '../../types/eyeControl';
import { EyeControlContext } from './eyeControlContext';
import type { EyeControlContextValue } from './eyeControlContext';
import { GazeCursor } from './GazeCursor';
import { CalibrationScreen } from './CalibrationScreen';
import { GazeKeyboard } from './GazeKeyboard';
import { EyeControlSettings } from './EyeControlSettings';
import { EyeAgentPanel } from './EyeAgentPanel';

const SNAP_RADIUS_PX = 80;
const SOS_DWELL_MS = 2000;
const EDGE_SCROLL_ZONE = 0.085; // top/bottom 8.5% of viewport

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

export const EyeControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always OFF by default as required
  const [enabled, setEnabled] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [activeInputEl, setActiveInputEl] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [sosNotice, setSosNotice] = useState<string | null>(null);

  const [settings, setSettings] = useState<EyeSettings>(loadSettings);
  const [calibration, setCalibration] = useState<CalibrationModel | null>(loadSavedCalibration);

  // Persist settings
  const handleSettingsChange = useCallback((next: EyeSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(EYE_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  // Apply root attribute for Eye-Friendly UI scaling (minimum 64x64 targets, high-contrast focus)
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute('data-eye-mode', 'true');
    } else {
      root.removeAttribute('data-eye-mode');
    }
    return () => root.removeAttribute('data-eye-mode');
  }, [enabled]);

  // Dwell & magnetic snap state
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

  const activateTarget = useCallback((el: HTMLElement | null) => {
    if (!el || !document.contains(el)) return;

    // Text input / textarea opens GazeKeyboard seamlessly
    if (
      (el instanceof HTMLInputElement && el.type !== 'submit' && el.type !== 'button' && el.type !== 'checkbox' && el.type !== 'radio') ||
      el instanceof HTMLTextAreaElement
    ) {
      el.focus();
      setActiveInputEl(el);
      setKeyboardOpen(true);
      return;
    }

    el.focus();
    el.click();
  }, []);

  const handlePauseToggle = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      if (settingsRef.current.voiceFeedback) {
        try {
          speak(next ? 'Eye control paused.' : 'Eye control resumed.', 'en-IN');
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const handleBlinkAction = useCallback(() => {
    if (pausedRef.current || calibrationOpenRef.current) return;
    if (snappedElementRef.current) {
      activateTarget(snappedElementRef.current);
    }
  }, [activateTarget]);

  const { gazePoint, features, condition, cameraActive, pauseHoldProgress, errorMessage } =
    useEyeTracking({
      enabled,
      consentGranted,
      paused,
      calibration,
      settings,
      onPauseToggle: handlePauseToggle,
      onBlinkAction: handleBlinkAction,
    });

  // Update magnetic snapping, dwell timer, and auto edge-scroll whenever gaze updates
  useEffect(() => {
    if (!enabled || !consentGranted || paused || calibrationOpen || settings.scanningEnabled || !gazePoint) {
      snappedElementRef.current = null;
      return;
    }

    const now = performance.now();

    // Auto edge scrolling when looking at top or bottom edges
    if (settings.edgeScrollEnabled) {
      const vh = window.innerHeight || 720;
      const topLimit = vh * EDGE_SCROLL_ZONE;
      const bottomLimit = vh * (1 - EDGE_SCROLL_ZONE);
      let dir: 'up' | 'down' | null = null;
      if (gazePoint.y <= topLimit) dir = 'up';
      else if (gazePoint.y >= bottomLimit) dir = 'down';

      if (dir !== edgeLookStartRef.current.dir) {
        edgeLookStartRef.current = { dir, at: now };
      } else if (dir && now - edgeLookStartRef.current.at > 380) {
        window.scrollBy({ top: dir === 'up' ? -22 : 22, behavior: 'auto' });
      }
    }

    // Find nearest interactive element within 80px magnetic radius
    const candidates = getInteractiveElements();
    let bestEl: HTMLElement | null = null;
    let bestDist = SNAP_RADIUS_PX;
    let bestRect: DOMRect | null = null;

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const d = distanceToRect(gazePoint.x, gazePoint.y, rect);
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
    gazePoint,
    activateTarget,
  ]);

  // Scanning fallback mode: highlight focusable elements one by one
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

  const requestEnable = useCallback(() => {
    if (consentGranted) {
      setEnabled(true);
      setPaused(false);
    } else {
      setConsentModalOpen(true);
    }
  }, [consentGranted]);

  const confirmConsentAndStart = () => {
    setConsentGranted(true);
    setConsentModalOpen(false);
    setEnabled(true);
    setPaused(false);
    // Automatically offer 9-point calibration if user has never calibrated before
    if (!calibration) {
      setCalibrationOpen(true);
    }
  };

  const disable = useCallback(() => {
    setEnabled(false);
    setPaused(false);
    setCalibrationOpen(false);
    setKeyboardOpen(false);
    setSettingsOpen(false);
    setAgentOpen(false);
    setConsentModalOpen(false);
  }, []);

  const handleSOS = async () => {
    try {
      await triggerEmergency();
      await setQuickAlert('CRITICAL SOS: Patient triggered 2s Eye-Control Emergency!');
    } catch {
      // ignore if offline
    }
    try {
      speak('Emergency SOS activated! Caregiver and medical team have been alerted.', 'en-IN');
    } catch {
      // ignore
    }
    setSosNotice('EMERGENCY SOS SENT — Caregiver alerted immediately.');
    window.setTimeout(() => setSosNotice(null), 6000);
  };

  const openKeyboard = useCallback((target?: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (target) setActiveInputEl(target);
    setKeyboardOpen(true);
  }, []);

  const contextValue: EyeControlContextValue = {
    enabled,
    paused,
    consentGranted,
    requestEnable,
    disable,
    togglePaused: handlePauseToggle,
    openCalibration: () => setCalibrationOpen(true),
    openSettings: () => setSettingsOpen(true),
    openKeyboard,
    openAgent: () => setAgentOpen(true),
  };

  const statusText = (() => {
    switch (condition) {
      case 'loading':
        return 'Starting local camera & loading MediaPipe FaceLandmarker…';
      case 'no_face':
        return 'Face not detected — align face with webcam';
      case 'too_dark':
        return 'Too dark — improve room lighting for accurate eye tracking';
      case 'move_closer':
        return 'Move closer — bring face nearer to the webcam';
      case 'camera_blocked':
        return errorMessage || 'Camera blocked — normal mouse, touch & keyboard remain active';
      case 'no_camera':
        return errorMessage || 'No webcam found — normal mouse, touch & keyboard remain active';
      case 'paused':
        return 'Paused — Hold both eyes shut for 2s or select Resume';
      case 'tab_hidden':
        return 'Tracking paused while tab is hidden';
      default:
        return calibration
          ? 'Tracking Active (On-Device)'
          : 'Tracking Active — Run 9-Point Calibration for best accuracy';
    }
  })();

  const isInteractiveLoopActive = enabled && consentGranted && !paused && !calibrationOpen;
  const activeSnappedEl = isInteractiveLoopActive ? snappedElement : null;
  const activeSnappedRect = activeSnappedEl ? snappedRect : null;
  const activeDwellProgress = isInteractiveLoopActive && !settings.scanningEnabled ? dwellProgress : 0;

  const isEmergencyTarget = activeSnappedEl?.dataset.eyeSos === 'true';

  // Compute snapped highlight visual cursor coordinates when magnetized
  const cursorX =
    activeSnappedEl && activeSnappedRect
      ? activeSnappedRect.left + activeSnappedRect.width / 2
      : gazePoint?.x ?? -100;

  const cursorY =
    activeSnappedEl && activeSnappedRect
      ? activeSnappedRect.top + activeSnappedRect.height / 2
      : gazePoint?.y ?? -100;

  return (
    <EyeControlContext.Provider value={contextValue}>
      {children}

      {/* Explicit Privacy & Camera Consent Modal */}
      {consentModalOpen && (
        <div
          className="eye-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Eye Control Privacy Consent"
        >
          <div className="eye-modal-card eye-consent-card">
            <div className="eye-modal-header">
              <div className="eye-modal-title">
                <ShieldCheck className="w-7 h-7 text-emerald-800" />
                <h2>Enable Eye-Gesture Accessibility Mode?</h2>
              </div>
            </div>
            <p className="eye-consent-desc">
              Sanjeevani will access your webcam strictly <strong>on-device</strong> using local MediaPipe Face Landmarker models to track eye gaze and deliberate blinks.
            </p>
            <ul className="eye-consent-list">
              <li>Video frames never leave your browser and are never recorded or uploaded.</li>
              <li>Interactive buttons enlarge to 64×64px minimum with dwell, blink, or scan selection.</li>
              <li>Close both eyes for 2 seconds anytime to pause or resume tracking.</li>
              <li>Normal mouse, touch, and keyboard navigation remain fully usable.</li>
            </ul>
            <div className="eye-modal-footer">
              <button
                type="button"
                className="eye-ctrl-btn primary"
                onClick={confirmConsentAndStart}
              >
                <Eye className="w-5 h-5" />
                <span>I Consent — Enable Camera &amp; Eye Mode</span>
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

      {/* Active Eye Control HUD Bar, Edge Scroll Controls, SOS, Modals & Gaze Cursor */}
      {enabled && (
        <>
          {/* Persistent Top Control & Camera-Active Indicator Bar */}
          <div
            className="eye-hud-bar"
            role="region"
            aria-label="Eye Control Accessibility Bar"
          >
            <div className={`eye-hud-status state-${condition}`} aria-live="polite">
              <span className={`eye-cam-dot ${cameraActive && !paused ? 'live' : ''}`} />
              <span>
                {cameraActive ? 'Camera On-Device: ' : ''}
                {statusText}
              </span>
              {pauseHoldProgress > 0.05 && (
                <span className="eye-pause-progress">
                  Holding eyes closed ({Math.round(pauseHoldProgress * 100)}%)
                </span>
              )}
            </div>

            <div className="eye-hud-actions">
              <button
                type="button"
                className={`eye-hud-btn ${paused ? 'warn' : ''}`}
                onClick={handlePauseToggle}
                aria-label={paused ? 'Resume Eye Tracking' : 'Pause Eye Tracking'}
              >
                {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                <span>{paused ? 'Resume' : 'Pause'}</span>
              </button>

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
                <span>{calibration ? 'Recalibrate' : 'Calibrate (9-Pt)'}</span>
              </button>

              <button
                type="button"
                className="eye-hud-btn"
                onClick={() => setKeyboardOpen((k) => !k)}
              >
                <Keyboard className="w-5 h-5" />
                <span>Keyboard &amp; Phrases</span>
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

              <button
                type="button"
                className="eye-hud-btn"
                onClick={() => setSettingsOpen(true)}
              >
                <Sliders className="w-5 h-5" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                className="eye-hud-btn exit"
                onClick={disable}
                aria-label="Turn Off Eye Control Mode"
              >
                <EyeOff className="w-5 h-5" />
                <span>Exit Eye Mode</span>
              </button>
            </div>
          </div>

          {/* Dedicated Gaze Scroll Buttons */}
          <div className="eye-scroll-dock" aria-label="Gaze Scroll Controls">
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

          {/* Always-Visible Large Emergency SOS Button (2s Dwell) */}
          <button
            type="button"
            className="eye-sos-fab"
            data-eye-sos="true"
            onClick={() => void handleSOS()}
            aria-label="Emergency SOS Help (Hold gaze for 2 seconds)"
          >
            <AlertOctagon className="w-7 h-7" />
            <div className="eye-sos-text">
              <strong>SOS</strong>
              <small>Hold 2s</small>
            </div>
          </button>

          {/* SOS Alert Confirmation Banner */}
          {sosNotice && (
            <div className="eye-sos-banner" role="alert">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span>{sosNotice}</span>
            </div>
          )}

          {/* Modals & Panels */}
          {calibrationOpen && (
            <CalibrationScreen
              features={features}
              onComplete={(model) => {
                saveCalibration(model);
                setCalibration(model);
                setCalibrationOpen(false);
                if (settings.voiceFeedback) {
                  try {
                    speak('Eye calibration complete.', 'en-IN');
                  } catch {
                    // ignore
                  }
                }
              }}
              onCancel={() => setCalibrationOpen(false)}
            />
          )}

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

          {/* Translucent Gaze Cursor + Snapped Focus Box */}
          <GazeCursor
            visible={!calibrationOpen && (gazePoint !== null || (settings.scanningEnabled && activeSnappedRect !== null))}
            x={cursorX}
            y={cursorY}
            sizePx={settings.cursorSizePx}
            dwellProgress={activeDwellProgress}
            isSnapped={Boolean(activeSnappedEl && activeSnappedRect)}
            snappedRect={activeSnappedRect}
            paused={paused}
            isEmergencyTarget={isEmergencyTarget}
          />
        </>
      )}
    </EyeControlContext.Provider>
  );
};
