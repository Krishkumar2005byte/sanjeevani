/**
 * GazeKeyboard.tsx - Large dwell-accessible QWERTY keyboard + Quick Spoken Phrases panel
 * Opens automatically when focusing an input or manually from the Eye Control bar.
 */

import React, { useState } from 'react';
import { Delete, CornerDownLeft, Space, X, Volume2, MessageSquare } from 'lucide-react';
import { speak } from '../../lib/speech.js';
import { setQuickAlert } from '../../lib/patientService.js';

export interface GazeKeyboardProps {
  visible: boolean;
  targetElement: HTMLInputElement | HTMLTextAreaElement | null;
  onClose: () => void;
  onPhraseSpoken?: (phrase: string) => void;
}

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const QUICK_PHRASES = [
  { id: 'nurse', text: 'Call nurse', urgent: true },
  { id: 'water', text: 'I need water', urgent: false },
  { id: 'pain', text: "I'm in pain", urgent: true },
  { id: 'emergency', text: 'Emergency', urgent: true },
];

export const GazeKeyboard: React.FC<GazeKeyboardProps> = ({
  visible,
  targetElement,
  onClose,
  onPhraseSpoken,
}) => {
  const [shiftUpper, setShiftUpper] = useState(false);
  const [lastSpokenPhrase, setLastSpokenPhrase] = useState<string | null>(null);

  if (!visible) return null;

  const updateNativeInputValue = (newVal: string) => {
    if (!targetElement) return;
    const proto =
      targetElement instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(targetElement, newVal);
      targetElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    targetElement.focus();
  };

  const handleKeyPress = (char: string) => {
    if (!targetElement) return;
    const ch = shiftUpper ? char.toUpperCase() : char.toLowerCase();
    updateNativeInputValue((targetElement.value || '') + ch);
  };

  const handleBackspace = () => {
    if (!targetElement) return;
    const cur = targetElement.value || '';
    updateNativeInputValue(cur.slice(0, -1));
  };

  const handleClear = () => {
    if (!targetElement) return;
    updateNativeInputValue('');
  };

  const handleEnter = () => {
    if (!targetElement) return;
    const form = targetElement.closest('form');
    if (form) {
      form.requestSubmit();
    }
    onClose();
  };

  const handleSpeakPhrase = async (phrase: string) => {
    setLastSpokenPhrase(phrase);
    try {
      speak(phrase, 'en-IN');
    } catch {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(phrase);
        window.speechSynthesis.speak(u);
      }
    }
    try {
      await setQuickAlert(`Eye Mode Voice Phrase: ${phrase}`);
    } catch {
      // Non-blocking
    }
    if (onPhraseSpoken) onPhraseSpoken(phrase);
  };

  const previewText = targetElement?.value ?? '';

  return (
    <div
      className="eye-keyboard-dock"
      role="dialog"
      aria-label="On-screen Gaze Keyboard and Quick Phrases"
    >
      {/* Quick Phrases Strip */}
      <div className="eye-phrases-bar">
        <div className="eye-phrases-title">
          <MessageSquare className="w-5 h-5" />
          <span>Quick Voice Phrases</span>
          {lastSpokenPhrase && (
            <span className="eye-phrase-spoken" aria-live="polite">
              Spoke: &ldquo;{lastSpokenPhrase}&rdquo;
            </span>
          )}
        </div>
        <div className="eye-phrases-grid">
          {QUICK_PHRASES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`eye-phrase-btn ${item.urgent ? 'is-urgent' : ''}`}
              onClick={() => handleSpeakPhrase(item.text)}
            >
              <Volume2 className="w-5 h-5 shrink-0" />
              <span>{item.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Text Preview & Keyboard Controls */}
      <div className="eye-kbd-header">
        <div className="eye-kbd-preview" aria-live="polite">
          {targetElement ? (
            previewText ? (
              <span>{previewText}</span>
            ) : (
              <span className="eye-kbd-placeholder">Typing into active input field…</span>
            )
          ) : (
            <span className="eye-kbd-placeholder">Select any text box first to type with eyes</span>
          )}
        </div>
        <button
          type="button"
          className="eye-kbd-action-btn close"
          onClick={onClose}
          aria-label="Close keyboard"
        >
          <X className="w-5 h-5" />
          <span>Close</span>
        </button>
      </div>

      {/* Dwell-Friendly Large Keys */}
      <div className="eye-kbd-rows">
        {KEY_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="eye-kbd-row">
            {row.map((letter) => (
              <button
                key={letter}
                type="button"
                className="eye-kbd-key"
                onClick={() => handleKeyPress(letter)}
              >
                {shiftUpper ? letter : letter.toLowerCase()}
              </button>
            ))}
          </div>
        ))}

        <div className="eye-kbd-row eye-kbd-bottom-row">
          <button
            type="button"
            className={`eye-kbd-key wide ${shiftUpper ? 'active' : ''}`}
            onClick={() => setShiftUpper((s) => !s)}
          >
            Shift
          </button>
          <button
            type="button"
            className="eye-kbd-key xwide"
            onClick={() => handleKeyPress(' ')}
            aria-label="Space bar"
          >
            <Space className="w-5 h-5" />
            <span>Space</span>
          </button>
          <button
            type="button"
            className="eye-kbd-key wide"
            onClick={handleBackspace}
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
            <span>Back</span>
          </button>
          <button
            type="button"
            className="eye-kbd-key wide"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="eye-kbd-key wide submit"
            onClick={handleEnter}
          >
            <CornerDownLeft className="w-5 h-5" />
            <span>Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
