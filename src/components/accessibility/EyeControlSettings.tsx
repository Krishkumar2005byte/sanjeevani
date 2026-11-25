/**
 * EyeControlSettings.tsx - Gaze-accessible Settings Modal
 * Defaults to Double-Blink Selection (blink twice to select), with optional Dwell & Scanning modes.
 */

import React from 'react';
import { Sliders, X, RotateCcw, Minus, Plus } from 'lucide-react';
import { DEFAULT_EYE_SETTINGS } from '../../types/eyeControl';
import type { EyeSettings } from '../../types/eyeControl';
import { useEyeControl } from './eyeControlContext';
import type { TremorTolerance } from './eyeControlContext';

export interface EyeControlSettingsProps {
  visible: boolean;
  settings: EyeSettings;
  onChange: (next: EyeSettings) => void;
  onRecalibrate: () => void;
  onClose: () => void;
}

const CURSOR_SIZES = [
  { label: 'Compact', value: 28 },
  { label: 'Standard', value: 46 },
  { label: 'Large', value: 58 },
  { label: 'Max', value: 72 },
];

const SMOOTH_OPTIONS: Array<{ label: string; value: EyeSettings['smoothingStrength'] }> = [
  { label: 'Fast', value: 'low' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Steady', value: 'strong' },
  { label: 'Ultra Smooth', value: 'max' },
];

export const EyeControlSettings: React.FC<EyeControlSettingsProps> = ({
  visible,
  settings,
  onChange,
  onRecalibrate,
  onClose,
}) => {
  const { tremorTolerance, setTremorTolerance } = useEyeControl();
  if (!visible) return null;

  const update = (patch: Partial<EyeSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <div
      className="eye-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Eye Control Settings"
    >
      <div className="eye-modal-card">
        <div className="eye-modal-header">
          <div className="eye-modal-title">
            <Sliders className="w-6 h-6" />
            <h2>Eye Control Settings</h2>
          </div>
          <button
            type="button"
            className="eye-ctrl-btn danger"
            onClick={onClose}
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
            <span>Close</span>
          </button>
        </div>

        <div className="eye-settings-grid">
          {/* Selection Methods */}
          <div className="eye-setting-group">
            <h3>Selection Methods</h3>
            <div className="eye-toggle-row">
              <button
                type="button"
                className={`eye-toggle-btn ${settings.doubleBlinkEnabled ? 'is-on' : ''}`}
                onClick={() => update({ doubleBlinkEnabled: !settings.doubleBlinkEnabled, blinkEnabled: true })}
                aria-pressed={settings.doubleBlinkEnabled}
              >
                <span>Double-Blink Click (Blink Twice)</span>
                <strong>{settings.doubleBlinkEnabled ? 'ON' : 'OFF'}</strong>
              </button>

              <button
                type="button"
                className={`eye-toggle-btn ${settings.dwellEnabled ? 'is-on' : ''}`}
                onClick={() => update({ dwellEnabled: !settings.dwellEnabled })}
                aria-pressed={settings.dwellEnabled}
              >
                <span>Dwell Click (Hold Gaze)</span>
                <strong>{settings.dwellEnabled ? 'ON' : 'OFF'}</strong>
              </button>

              <button
                type="button"
                className={`eye-toggle-btn ${settings.scanningEnabled ? 'is-on' : ''}`}
                onClick={() => update({ scanningEnabled: !settings.scanningEnabled })}
                aria-pressed={settings.scanningEnabled}
              >
                <span>Auto-Scanning Mode</span>
                <strong>{settings.scanningEnabled ? 'ON' : 'OFF'}</strong>
              </button>
            </div>
          </div>

          {/* Double-Blink Window Stepper */}
          <div className="eye-setting-group">
            <h3>Double-Blink Window: {settings.doubleBlinkWindowMs}ms</h3>
            <div className="eye-stepper-row">
              <button
                type="button"
                className="eye-stepper-btn"
                onClick={() => update({ doubleBlinkWindowMs: Math.max(500, settings.doubleBlinkWindowMs - 100) })}
                aria-label="Decrease double blink window"
              >
                <Minus className="w-5 h-5" />
                <span>Faster</span>
              </button>
              <span className="eye-stepper-val">{settings.doubleBlinkWindowMs} ms</span>
              <button
                type="button"
                className="eye-stepper-btn"
                onClick={() => update({ doubleBlinkWindowMs: Math.min(1500, settings.doubleBlinkWindowMs + 100) })}
                aria-label="Increase double blink window"
              >
                <Plus className="w-5 h-5" />
                <span>More Time</span>
              </button>
            </div>
          </div>

          {/* Dwell Time Stepper */}
          <div className="eye-setting-group">
            <h3>Dwell Time (when enabled): {(settings.dwellTimeMs / 1000).toFixed(1)}s</h3>
            <div className="eye-stepper-row">
              <button
                type="button"
                className="eye-stepper-btn"
                onClick={() => update({ dwellTimeMs: Math.max(600, settings.dwellTimeMs - 200) })}
                aria-label="Decrease dwell time"
              >
                <Minus className="w-5 h-5" />
                <span>Faster</span>
              </button>
              <span className="eye-stepper-val">{settings.dwellTimeMs} ms</span>
              <button
                type="button"
                className="eye-stepper-btn"
                onClick={() => update({ dwellTimeMs: Math.min(3000, settings.dwellTimeMs + 200) })}
                aria-label="Increase dwell time"
              >
                <Plus className="w-5 h-5" />
                <span>Longer</span>
              </button>
            </div>
          </div>

          {/* Scanning Speed Stepper */}
          <div className="eye-setting-group">
            <h3>Scanning Interval: {(settings.scanSpeedMs / 1000).toFixed(1)}s</h3>
            <div className="eye-stepper-row">
              <button
                type="button"
                className="eye-stepper-btn"
                onClick={() => update({ scanSpeedMs: Math.max(1000, settings.scanSpeedMs - 200) })}
                aria-label="Decrease scanning speed interval"
              >
                <Minus className="w-5 h-5" />
                <span>Faster</span>
              </button>
              <span className="eye-stepper-val">{settings.scanSpeedMs} ms</span>
              <button
                type="button"
                className="eye-stepper-btn"
                onClick={() => update({ scanSpeedMs: Math.min(3500, settings.scanSpeedMs + 200) })}
                aria-label="Increase scanning speed interval"
              >
                <Plus className="w-5 h-5" />
                <span>Slower</span>
              </button>
            </div>
          </div>

          {/* Cursor Size */}
          <div className="eye-setting-group">
            <h3>Gaze Cursor Size</h3>
            <div className="eye-choice-row">
              {CURSOR_SIZES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`eye-choice-btn ${settings.cursorSizePx === opt.value ? 'is-selected' : ''}`}
                  onClick={() => update({ cursorSizePx: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* One Euro Smoothing */}
          <div className="eye-setting-group">
            <h3>Jitter Smoothing (One Euro Filter)</h3>
            <div className="eye-choice-row">
              {SMOOTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`eye-choice-btn ${settings.smoothingStrength === opt.value ? 'is-selected' : ''}`}
                  onClick={() => update({ smoothingStrength: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Helpers */}
          <div className="eye-setting-group">
            <h3>Tremor Tolerance (Hand Pinch &amp; Snap)</h3>
            <div className="eye-choice-row">
              {(['standard', 'high', 'max'] as TremorTolerance[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`eye-choice-btn ${tremorTolerance === lvl ? 'is-selected' : ''}`}
                  onClick={() => setTremorTolerance(lvl)}
                >
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="eye-setting-group">
            <h3>Navigation &amp; Voice</h3>
            <div className="eye-toggle-row">
              <button
                type="button"
                className={`eye-toggle-btn ${settings.edgeScrollEnabled ? 'is-on' : ''}`}
                onClick={() => update({ edgeScrollEnabled: !settings.edgeScrollEnabled })}
                aria-pressed={settings.edgeScrollEnabled}
              >
                <span>Look at Screen Edges to Scroll</span>
                <strong>{settings.edgeScrollEnabled ? 'ON' : 'OFF'}</strong>
              </button>

              <button
                type="button"
                className={`eye-toggle-btn ${settings.voiceFeedback ? 'is-on' : ''}`}
                onClick={() => update({ voiceFeedback: !settings.voiceFeedback })}
                aria-pressed={settings.voiceFeedback}
              >
                <span>Spoken Status Prompts</span>
                <strong>{settings.voiceFeedback ? 'ON' : 'OFF'}</strong>
              </button>
            </div>
          </div>
        </div>

        <div className="eye-modal-footer">
          <button
            type="button"
            className="eye-ctrl-btn primary"
            onClick={() => {
              onClose();
              onRecalibrate();
            }}
          >
            <RotateCcw className="w-5 h-5" />
            <span>Run 9-Point Calibration</span>
          </button>

          <button
            type="button"
            className="eye-ctrl-btn"
            onClick={() => onChange(DEFAULT_EYE_SETTINGS)}
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
