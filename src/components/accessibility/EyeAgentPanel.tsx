/**
 * EyeAgentPanel.tsx - High-contrast Gaze-Accessible AI Voice Agent Panel
 * Triggers Sanjeevani's existing analyzeSymptomsWithAi engine & speaks responses aloud
 * while displaying extra-large readable diagnosis & cure instructions.
 */

import React, { useState } from 'react';
import { Bot, Mic, Send, Volume2, X, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { analyzeSymptomsWithAi } from '../../lib/aiChatbotService.js';
import { getPatient } from '../../lib/patientService.js';
import { speak } from '../../lib/speech.js';

export interface EyeAgentPanelProps {
  visible: boolean;
  onClose: () => void;
  onFocusInput?: (el: HTMLInputElement) => void;
}

const AGENT_PROMPTS = [
  'I have chest heaviness and sweating',
  'Shortness of breath',
  'High fever and chills',
  'I need water / dry throat',
  'Severe headache',
  'Stomach burning / acidity',
];

interface AgentResult {
  condition: string;
  curability: string;
  isEmergency: boolean;
  alertMessage: string;
  solutions: string[];
  recommendedDoctorSpecialty?: string;
}

export const EyeAgentPanel: React.FC<EyeAgentPanelProps> = ({
  visible,
  onClose,
  onFocusInput,
}) => {
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<AgentResult | null>(null);

  if (!visible) return null;

  const runAgentQuery = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setLoading(true);
    try {
      const patient = await getPatient();
      const res = await analyzeSymptomsWithAi({
        userQuery: clean,
        activeSymptoms: patient?.symptoms || [],
        patientMeta: patient || {},
      });
      setDiagnosis(res);
      const speechMsg = res.isEmergency
        ? `Emergency alert! ${res.condition}. ${res.alertMessage}`
        : `${res.condition}. Status: ${res.curability}. ${res.solutions?.[0] || ''}`;
      speak(speechMsg, 'en-IN');
    } catch (err) {
      console.warn('[EyeAgentPanel] Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceMic = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      speak('Microphone voice recognition is unavailable in this browser. Select a symptom prompt on screen.', 'en-IN');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = new (SpeechRec as any)();
      rec.lang = 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setListening(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        setQuery(transcript);
        setListening(false);
        if (transcript) void runAgentQuery(transcript);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <div
      className="eye-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Sanjeevani AI Voice Agent"
    >
      <div className="eye-modal-card eye-agent-card">
        <div className="eye-modal-header">
          <div className="eye-modal-title">
            <Bot className="w-7 h-7" />
            <h2>Sanjeevani AI Voice Agent</h2>
          </div>
          <button
            type="button"
            className="eye-ctrl-btn danger"
            onClick={onClose}
            aria-label="Close AI Voice Agent"
          >
            <X className="w-5 h-5" />
            <span>Close</span>
          </button>
        </div>

        {/* Large Gaze-Selectable Quick Symptom Prompts */}
        <div className="eye-agent-prompts">
          {AGENT_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              className="eye-agent-chip"
              onClick={() => {
                setQuery(p);
                void runAgentQuery(p);
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Voice Mic + Text Input */}
        <form
          className="eye-agent-form"
          onSubmit={(e) => {
            e.preventDefault();
            void runAgentQuery(query);
          }}
        >
          <button
            type="button"
            className={`eye-ctrl-btn ${listening ? 'danger' : 'primary'}`}
            onClick={handleVoiceMic}
          >
            <Mic className="w-5 h-5" />
            <span>{listening ? 'Listening…' : 'Speak Symptom'}</span>
          </button>

          <input
            type="text"
            className="eye-agent-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={(e) => onFocusInput?.(e.currentTarget)}
            placeholder="Dwell here to open Gaze Keyboard…"
            aria-label="Describe symptoms for AI Agent"
          />

          <button
            type="submit"
            className="eye-ctrl-btn primary"
            disabled={loading || !query.trim()}
          >
            <Send className="w-5 h-5" />
            <span>{loading ? 'Analyzing…' : 'Ask Agent'}</span>
          </button>
        </form>

        {/* Large High-Contrast AI Response Panel */}
        {diagnosis && (
          <div
            className={`eye-agent-response ${diagnosis.isEmergency ? 'is-emergency' : 'is-safe'}`}
            aria-live="polite"
          >
            <div className="eye-agent-resp-head">
              {diagnosis.isEmergency ? (
                <AlertOctagon className="w-7 h-7 shrink-0 text-red-700" />
              ) : (
                <CheckCircle2 className="w-7 h-7 shrink-0 text-emerald-800" />
              )}
              <div>
                <h3 className="eye-agent-condition">{diagnosis.condition}</h3>
                <span className="eye-agent-curability">Status: {diagnosis.curability}</span>
              </div>
              <button
                type="button"
                className="eye-ctrl-btn"
                onClick={() => speak(`${diagnosis.condition}. ${diagnosis.alertMessage}`, 'en-IN')}
                aria-label="Read AI diagnosis aloud"
              >
                <Volume2 className="w-5 h-5" />
                <span>Read Aloud</span>
              </button>
            </div>

            <p className="eye-agent-advice">{diagnosis.alertMessage}</p>

            {diagnosis.solutions && diagnosis.solutions.length > 0 && (
              <ul className="eye-agent-solutions">
                {diagnosis.solutions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
