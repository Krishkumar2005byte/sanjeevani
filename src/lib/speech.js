/**
 * speech.js - Multilingual Voice Announcement Engine
 * Supports Hindi, English, Sindhi, Punjabi, Marathi, Maithili & all 28 Indic languages
 * with automatic native voice resolution + Devanagari phonetic fallback for guaranteed voice output.
 */

let audioCtx = null;

/**
 * Plays the gentle 2-tone melodic pre-announcement chime.
 */
export function playMetroChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return Promise.resolve();

    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.22);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.26, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 0.68);

    return new Promise((resolve) => setTimeout(resolve, 440));
  } catch (err) {
    console.warn('[Speech] AudioContext chime error:', err);
    return Promise.resolve();
  }
}

/**
 * Resolves the best available browser TTS voice for a target locale.
 * Priority:
 * 1. Exact locale match (e.g. mr-IN, pa-IN, hi-IN, en-IN)
 * 2. Same language prefix match (e.g. mr, pa, hi, en)
 * 3. For Indic Devanagari languages (sd, mai, mr, pa phonetic fallback), falls back to hi-IN voice
 * 4. First available system voice
 */
function resolveVoiceAndText(text, langLocale = 'hi-IN', fallbackText = '') {
  if (!('speechSynthesis' in window)) {
    return { voice: null, lang: langLocale, spokenText: text };
  }

  const voices = window.speechSynthesis.getVoices() || [];
  const targetLang = (langLocale || 'hi-IN').toLowerCase();
  const targetPrefix = targetLang.split('-')[0];

  // 1. Exact locale match
  let voice = voices.find((v) => v.lang.toLowerCase() === targetLang);

  // 2. Language prefix match (e.g. en-US for en-IN, mr-IN for mr)
  if (!voice) {
    voice = voices.find((v) => v.lang.toLowerCase().startsWith(`${targetPrefix}-`) || v.lang.toLowerCase() === targetPrefix);
  }

  if (voice) {
    return { voice, lang: voice.lang || langLocale, spokenText: text };
  }

  // 3. Indic Devanagari fallback: if native pa/sd/mai/mr voice pack isn't installed on OS,
  // use hi-IN voice (and phonetic Devanagari fallbackText if provided, e.g. for Gurmukhi Punjabi)
  const indicFallbackPrefixes = ['sd', 'mai', 'mr', 'pa', 'bho', 'doi', 'kok', 'ne', 'sa', 'mwr', 'bgc', 'hne', 'mag'];
  if (indicFallbackPrefixes.includes(targetPrefix)) {
    const hiVoice = voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
    return {
      voice: hiVoice || voices[0] || null,
      lang: hiVoice ? hiVoice.lang : 'hi-IN',
      spokenText: fallbackText || text
    };
  }

  // 4. Default fallback
  return {
    voice: voices[0] || null,
    lang: langLocale,
    spokenText: text
  };
}

/**
 * Speaks text cleanly in the selected language.
 * @param {string} text - Primary native text to speak
 * @param {string} langLocale - BCP-47 locale (e.g. 'hi-IN', 'en-IN', 'sd-IN', 'pa-IN', 'mr-IN', 'mai-IN')
 * @param {object} options - { playChime, fallbackText, pitch, rate, volume }
 */
export async function speak(text, langLocale = 'hi-IN', options = {}) {
  if (!text || !('speechSynthesis' in window)) {
    return;
  }

  const playChime = options.playChime !== false;

  window.speechSynthesis.cancel();

  if (playChime) {
    await playMetroChime();
  }

  const { voice, lang, spokenText } = resolveVoiceAndText(
    text,
    langLocale,
    options.fallbackText
  );

  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = lang;
  utterance.pitch = options.pitch ?? 0.92;
  utterance.rate = options.rate ?? 0.88;
  utterance.volume = options.volume ?? 1.0;

  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

// Pre-warm voices list in Chromium browsers
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
}
