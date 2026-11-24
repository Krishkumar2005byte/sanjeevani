/**
 * triage.js - Gemini AI Triage with Guaranteed Offline Fallback
 * Owner: Dev 2 (AI Medical Triage)
 * 
 * Simple explanation:
 * Calls Google's Gemini API to evaluate reported symptoms and assign a cautious
 * urgency level (Low / Medium / High). If the API key is missing, network is offline,
 * or the call times out after 6 seconds, it automatically falls back to safe rule-based triage.
 */

// Fallback rules mapped to every symptom in symptoms.json
const SYMPTOM_FALLBACK_MAP = {
  'chest-pain': { urgency: 'High', advice: 'Potential cardiac symptom. Seek emergency medical attention immediately.' },
  'breathing-trouble': { urgency: 'High', advice: 'Respiratory distress requires immediate urgent medical care.' },
  'severe-headache': { urgency: 'High', advice: 'Sudden severe headache may require prompt neurological evaluation.' },
  'headache': { urgency: 'Medium', advice: 'Persistent headache requires rest, hydration, and doctor evaluation.' },
  'high-fever': { urgency: 'Medium', advice: 'High fever requires hydration, temperature monitoring, and doctor consultation.' },
  'nausea': { urgency: 'Medium', advice: 'Monitor for dehydration and consult a doctor if nausea or vomiting persists.' },
  'dizziness': { urgency: 'Medium', advice: 'Rest in a safe position to prevent falls and consult a doctor.' },
  'body-pain': { urgency: 'Medium', advice: 'Full body aches require rest and physical evaluation.' },
  'stomach-pain': { urgency: 'Medium', advice: 'Persistent abdominal pain should be evaluated by a healthcare professional.' },
  'need-water': { urgency: 'Low', advice: 'Keep the patient hydrated and comfortable with clean drinking water.' },
  'need-washroom': { urgency: 'Low', advice: 'Assist the patient safely to the washroom or provide mobility support.' }
};

/**
 * Compute safe rule-based urgency if Gemini is unavailable or errors
 */
function getRuleBasedFallback(symptoms = []) {
  if (!symptoms || symptoms.length === 0) {
    return {
      urgency: 'Low',
      aiSummary: 'No symptoms currently reported. Patient is stable.'
    };
  }

  let highestPriority = 'Low';
  let adviceList = [];

  for (const sym of symptoms) {
    const normalized = sym.toLowerCase().replace(/\s+/g, '-');
    const matched = SYMPTOM_FALLBACK_MAP[normalized] ||
      Object.entries(SYMPTOM_FALLBACK_MAP).find(([key]) => sym.toLowerCase().includes(key.replace('-', ' ')))?.[1];

    if (matched) {
      adviceList.push(matched.advice);
      if (matched.urgency === 'High') {
        highestPriority = 'High';
      } else if (matched.urgency === 'Medium' && highestPriority !== 'High') {
        highestPriority = 'Medium';
      }
    }
  }

  const primaryAdvice = adviceList[0] || 'Observe patient closely and speak with a healthcare provider.';

  return {
    urgency: highestPriority,
    aiSummary: `[Fallback Triage] Urgency ${highestPriority}: ${primaryAdvice}`
  };
}

/**
 * Evaluates symptoms using Gemini API, with a strict 6-second timeout.
 * @param {Array<string>} symptoms - List of active symptom names or IDs
 * @returns {Promise<{ urgency: 'Low'|'Medium'|'High', aiSummary: string }>}
 */
export async function triageSymptoms(symptoms = []) {
  if (!symptoms || symptoms.length === 0) {
    return { urgency: 'Low', aiSummary: 'No symptoms reported. Patient is resting comfortably.' };
  }

  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  // Fallback immediately if API key is not configured or is a placeholder
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return getRuleBasedFallback(symptoms);
  }

  const symptomText = symptoms.join(', ');
  const prompt = `Return JSON only, no markdown: {"urgency": "Low"|"Medium"|"High", "short_advice": "one short sentence"}. Never diagnose. Symptoms: ${symptomText}`;

  // Enforce a strict 6-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Gemini API] Returned status ${response.status}. Using fallback triage.`);
      return getRuleBasedFallback(symptoms);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Safely strip code fences like ```json ... ```
    const cleanedJson = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);

    // Validate structure
    const validUrgencies = ['Low', 'Medium', 'High'];
    const urgency = validUrgencies.includes(parsed.urgency) ? parsed.urgency : 'Medium';
    const aiSummary = parsed.short_advice || 'Please have a doctor evaluate these symptoms.';

    return {
      urgency,
      aiSummary
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[Gemini API] Call failed or timed out. Using fallback triage:', err.message);
    return getRuleBasedFallback(symptoms);
  }
}
