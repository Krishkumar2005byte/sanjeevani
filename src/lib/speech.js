/**
 * speech.js - Default Delhi Metro Announcer Voice Engine
 * Owner: Dev 1 (Patient Experience & Voice Output)
 * 
 * Default sound: Iconic Delhi Metro Announcer (Shammi Narang Baritone)
 * with the signature 2-tone melodic pre-announcement chime.
 */

let audioCtx = null;

/**
 * Plays the iconic Delhi Metro 2-tone melodic chime before the announcement.
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

    // Tone 1: 587.33 Hz (D5)
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

    // Tone 2: 880 Hz (A5) - High bell resonance
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
 * Searches for a resonant masculine voice available in the browser.
 */
function findBestVoice(langLocale = 'hi-IN') {
  if (!('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLang = (langLocale || 'hi-IN').toLowerCase();
  const targetPrefix = targetLang.split('-')[0];

  const maleKeywords = ['ravi', 'hemant', 'david', 'mark', 'george', 'guy', 'male', 'pradeep', 'narang', 'shyam'];

  // 1. Language match with male identifier
  let voice = voices.find((v) => {
    const name = v.name.toLowerCase();
    const vLang = v.lang.toLowerCase();
    const isLangMatch = vLang === targetLang || vLang.startsWith(targetPrefix);
    const isMale = maleKeywords.some((k) => name.includes(k));
    return isLangMatch && isMale;
  });

  // 2. Indian male voice
  if (!voice) {
    voice = voices.find((v) => {
      const name = v.name.toLowerCase();
      const vLang = v.lang.toLowerCase();
      const isIndian = vLang.includes('in') || name.includes('india');
      const isMale = maleKeywords.some((k) => name.includes(k));
      return isIndian && isMale;
    });
  }

  // 3. Fallback to any language match
  if (!voice) {
    voice = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
  }

  return voice || voices[0];
}

/**
 * Speaks text using the default Delhi Metro Announcer profile (Shammi Narang Baritone).
 * Automatically plays the signature metro pre-chime.
 * 
 * @param {string} text - Phrase to vocalize
 * @param {string} langLocale - Locale code (e.g. 'hi-IN', 'en-IN', 'ta-IN')
 * @param {object} options - Optional overrides
 */
export async function speak(text, langLocale = 'hi-IN', options = {}) {
  if (!('speechSynthesis' in window)) {
    console.warn('[Speech] Browser does not support speechSynthesis API.');
    return;
  }

  const playChime = options.playChime !== false; // Default true

  // Cancel any ongoing utterance
  window.speechSynthesis.cancel();

  // Play signature Delhi Metro melodic chime
  if (playChime) {
    await playMetroChime();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langLocale;

  // Delhi Metro Announcer Acoustic Characteristics:
  // Deep baritone resonance, measured formal cadence, maximum clarity
  utterance.pitch = options.pitch ?? 0.82;
  utterance.rate = options.rate ?? 0.85;
  utterance.volume = options.volume ?? 1.0;

  const selectedVoice = findBestVoice(langLocale);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  window.speechSynthesis.speak(utterance);
}
