/**
 * triage.js - 3-Tier Urgency Triage Engine (Green / Orange / Red) with Gemini + Offline Fallback
 * Owner: Dev 2 & Member 4 (UI/Triage Parameters)
 *
 * Urgency Parameters:
 * - Low (Green / Calm): Routine comfort needs (Need Water, Washroom) — no alert banner
 * - Medium (Orange / Moderate Alert): Single or pair of moderate symptoms (High Fever, Headache, Nausea, Dizziness, Body Pain)
 * - High (Red / Critical Alert): Critical cardiac/respiratory symptoms (Chest Pain, Breathing Trouble),
 *   Emergency Help, or 3+ moderate symptoms active simultaneously
 */

const PRIORITY_RANK = { Low: 1, Medium: 2, High: 3 };

export const SYMPTOM_TRIAGE_RULES = {
  'chest-pain': {
    urgency: 'High',
    alertTier: 'red',
    advice: 'Potential cardiac symptom. Seek urgent medical attention immediately.'
  },
  'breathing-trouble': {
    urgency: 'High',
    alertTier: 'red',
    advice: 'Respiratory distress requires immediate urgent medical care.'
  },
  'severe-headache': {
    urgency: 'High',
    alertTier: 'red',
    advice: 'Sudden severe headache requires prompt neurological evaluation.'
  },
  'high-fever': {
    urgency: 'Medium',
    alertTier: 'orange',
    advice: 'High fever requires temperature monitoring, hydration, and doctor consultation.'
  },
  'headache': {
    urgency: 'Medium',
    alertTier: 'orange',
    advice: 'Persistent headache requires rest, hydration, and clinical review.'
  },
  'nausea': {
    urgency: 'Medium',
    alertTier: 'orange',
    advice: 'Monitor for dehydration and consult a doctor if nausea persists.'
  },
  'dizziness': {
    urgency: 'Medium',
    alertTier: 'orange',
    advice: 'Help the patient lie down safely to prevent falls and monitor vitals.'
  },
  'body-pain': {
    urgency: 'Medium',
    alertTier: 'orange',
    advice: 'Body aches require comfort care and physician evaluation if worsening.'
  },
  'stomach-pain': {
    urgency: 'Medium',
    alertTier: 'orange',
    advice: 'Persistent abdominal pain should be evaluated by a healthcare provider.'
  },
  'need-water': {
    urgency: 'Low',
    alertTier: 'green',
    advice: 'Routine comfort request: provide clean drinking water to the patient.'
  },
  'need-washroom': {
    urgency: 'Low',
    alertTier: 'green',
    advice: 'Routine comfort request: assist the patient safely to the washroom.'
  }
};

export function getSymptomRule(symptomName = '') {
  const normalized = symptomName.toLowerCase().trim().replace(/\s+/g, '-');
  if (SYMPTOM_TRIAGE_RULES[normalized]) {
    return SYMPTOM_TRIAGE_RULES[normalized];
  }
  const matchedEntry = Object.entries(SYMPTOM_TRIAGE_RULES).find(([key]) =>
    symptomName.toLowerCase().includes(key.replace(/-/g, ' '))
  );
  return matchedEntry ? matchedEntry[1] : null;
}

/**
 * Deterministic 3-tier clinical triage fallback:
 * - Low (Green): Only routine comfort needs (e.g., Need Water)
 * - Medium (Orange): 1–2 moderate symptoms (Fever, Headache, Nausea, Dizziness, Body Pain)
 * - High (Red): Any critical symptom (Chest Pain, Breathing Trouble) OR 3+ moderate symptoms combined
 */
function getRuleBasedFallback(symptoms = []) {
  if (!symptoms || symptoms.length === 0) {
    return {
      urgency: 'Low',
      aiSummary: 'Patient is resting comfortably. No symptoms reported.'
    };
  }

  let highestPriority = 'Low';
  let primaryAdvice = '';
  let moderateCount = 0;

  for (const sym of symptoms) {
    const rule = getSymptomRule(sym);
    if (!rule) continue;

    if (rule.urgency === 'Medium') {
      moderateCount += 1;
    }

    if (PRIORITY_RANK[rule.urgency] > PRIORITY_RANK[highestPriority]) {
      highestPriority = rule.urgency;
      primaryAdvice = rule.advice;
    } else if (!primaryAdvice && rule.urgency === highestPriority) {
      primaryAdvice = rule.advice;
    }
  }

  // Escalate to High (Red) when 3 or more moderate symptoms occur together
  if (highestPriority === 'Medium' && moderateCount >= 3) {
    highestPriority = 'High';
    primaryAdvice =
      'Multiple moderate symptoms reported simultaneously. Escalated for prompt medical evaluation.';
  }

  const summary =
    primaryAdvice || 'Observe the patient closely and consult a healthcare provider.';

  return {
    urgency: highestPriority,
    aiSummary: summary
  };
}

/**
 * Evaluates active symptoms via Gemini API (if configured) with guaranteed 3-tier offline fallback.
 * @param {Array<string>} symptoms
 * @returns {Promise<{ urgency: 'Low'|'Medium'|'High', aiSummary: string }>}
 */
export async function triageSymptoms(symptoms = []) {
  if (!symptoms || symptoms.length === 0) {
    return {
      urgency: 'Low',
      aiSummary: 'Patient is resting comfortably. No symptoms reported.'
    };
  }

  const ruleBaseline = getRuleBasedFallback(symptoms);
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return ruleBaseline;
  }

  const symptomText = symptoms.join(', ');
  const prompt = `Return JSON only, no markdown: {"urgency": "Low"|"Medium"|"High", "short_advice": "one short sentence"}. Never diagnose. Comfort requests like Need Water alone are Low. Symptoms: ${symptomText}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return ruleBaseline;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    const validUrgencies = ['Low', 'Medium', 'High'];
    const urgency = validUrgencies.includes(parsed.urgency) ? parsed.urgency : ruleBaseline.urgency;
    const aiSummary = parsed.short_advice || ruleBaseline.aiSummary;

    return { urgency, aiSummary };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[Gemini API] Call failed or timed out. Using fallback triage:', err.message);
    return ruleBaseline;
  }
}
