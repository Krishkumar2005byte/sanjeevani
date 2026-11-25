/**
 * aiChatbotService.js - Intelligent Symptom Root-Cause & Disease Prediction Engine
 * Owner: Shared Architecture & AI Healthcare Core
 *
 * Capabilities:
 * - Analyzes patient/caregiver reported symptoms.
 * - Predicts potential root-cause conditions/diseases with cautious clinical grounding.
 * - Categorizes condition as "Curable", "Manageable", or "Critical / Incurable at Home".
 * - Provides actionable home care solutions & first aid when safe/curable.
 * - Dispatches high-priority red alerts to Patient & Caregiver when critical/incurable.
 * - Works online via Google Gemini API (gemini-1.5-flash) with a comprehensive offline
 *   clinical rule-based fallback matrix.
 */

import { triggerEmergency, setQuickAlert } from './patientService.js';

// Comprehensive offline clinical knowledge base for zero-config mode
export const OFFLINE_CLINICAL_KNOWLEDGE = [
  {
    keywords: ['chest', 'heart', 'arm', 'jaw', 'sweating', 'cardiac', 'left arm'],
    condition: 'Suspected Angina Pectoris / Acute Coronary Syndrome',
    curability: 'Critical / Incurable at Home',
    isEmergency: true,
    alertTitle: '🚨 CRITICAL CARDIAC WARNING',
    alertMessage: 'Symptoms indicate potential cardiac ischemia or heart attack. Do not attempt home remedies. Immediate emergency medical response required.',
    solutions: [
      'Have patient sit upright and rest immediately; avoid any exertion.',
      'Loosen tight clothing around neck and chest.',
      'Check if patient has prescribed sublingual Nitroglycerin or Aspirin from their cardiologist.',
      'Call emergency ambulance (108 / 112) or doctor immediately.'
    ],
    recommendedDoctorSpecialty: 'Cardiologist'
  },
  {
    keywords: ['breath', 'breathing', 'wheez', 'suffocat', 'air', 'asthma'],
    condition: 'Acute Respiratory Distress / Bronchospasm',
    curability: 'Critical / Incurable at Home',
    isEmergency: true,
    alertTitle: '🚨 CRITICAL RESPIRATORY WARNING',
    alertMessage: 'Severe breathing difficulty can cause hypoxia. Immediate oxygen or clinical bronchodilator therapy is required.',
    solutions: [
      'Sit patient in a high Fowler (upright leaning slightly forward) position.',
      'Administer prescribed rescue inhaler (e.g. Salbutamol / Albuterol) if available.',
      'Ensure room has open ventilation and fresh airflow.',
      'Seek emergency hospitalization if lips turn bluish or breathing is labored.'
    ],
    recommendedDoctorSpecialty: 'Pulmonologist'
  },
  {
    keywords: ['fever', 'chills', 'temperature', 'shiver'],
    condition: 'Acute Febrile Illness / Viral Infection or Malaria',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '⚠️ Moderate Illness Alert',
    alertMessage: 'High body temperature requires regular monitoring, cold sponging, and hydration.',
    solutions: [
      'Apply lukewarm water sponge compresses to forehead and neck.',
      'Maintain continuous oral hydration with water, coconut water, or ORS.',
      'Administer Paracetamol (500mg) as per medical guidelines if temp exceeds 101°F.',
      'Consult a general physician if fever lasts beyond 48 hours or is accompanied by stiff neck.'
    ],
    recommendedDoctorSpecialty: 'General Physician'
  },
  {
    keywords: ['washroom', 'urine', 'toilet', 'bladder', 'burning'],
    condition: 'Urinary Urgency / Possible UTI or Fluid Retention',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '🚻 Patient Comfort & Assistance Needed',
    alertMessage: 'Urgent assistance needed to reach the washroom safely to prevent falls.',
    solutions: [
      'Provide immediate physical support or walking aid to the washroom.',
      'Increase fluid and water intake to flush out potential urinary tract irritation.',
      'Check for pain or burning sensation during urination.',
      'Consult a urologist if urine is cloudy, painful, or contains traces of blood.'
    ],
    recommendedDoctorSpecialty: 'Urologist'
  },
  {
    keywords: ['water', 'thirst', 'dry', 'dehydrat', 'throat'],
    condition: 'Acute Dehydration & Electrolyte Imbalance',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '💧 Hydration Needed',
    alertMessage: 'Patient requires oral hydration to avoid dehydration and weakness.',
    solutions: [
      'Provide sips of clean water or oral rehydration solution (ORS).',
      'Check for dry tongue, sunken eyes, or dizziness when sitting up.',
      'Avoid caffeinated or sugary beverages.',
      'If patient is unable to swallow liquids, alert caregiver for IV fluid support.'
    ],
    recommendedDoctorSpecialty: 'General Physician'
  },
  {
    keywords: ['headache', 'head', 'migraine', 'throbbing', 'light'],
    condition: 'Migraine / Tension Headache',
    curability: 'Manageable',
    isEmergency: false,
    alertTitle: '💆 Neurological Rest Recommended',
    alertMessage: 'Patient experiencing painful headache requiring sensory reduction.',
    solutions: [
      'Rest in a quiet, dark room away from bright screens and noise.',
      'Apply a cool compress or ice pack to forehead or temples.',
      'Ensure adequate hydration and regular meal intake.',
      'If headache is "thunderclap" sudden and worst of life, seek immediate neurological ER.'
    ],
    recommendedDoctorSpecialty: 'Neurologist'
  },
  {
    keywords: ['stomach', 'acid', 'burn', 'reflux', 'gastric', 'heartburn', 'cramp'],
    condition: 'Gastroesophageal Reflux (GERD) / Gastritis',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '🍲 Gastric Distress Alert',
    alertMessage: 'Stomach irritation or acid reflux detected.',
    solutions: [
      'Keep upper body elevated at 30-45 degrees; do not lie flat immediately.',
      'Sip cold milk or water with an antacid tablet/gel if prescribed.',
      'Avoid spicy, fried, or highly acidic foods.',
      'Consult a gastroenterologist if accompanied by black stool or vomiting blood.'
    ],
    recommendedDoctorSpecialty: 'Gastroenterologist'
  },
  {
    keywords: ['dizzy', 'faint', 'spinning', 'vertigo', 'lightheaded'],
    condition: 'Postural Hypotension / Benign Positional Vertigo',
    curability: 'Manageable',
    isEmergency: false,
    alertTitle: '⚠️ Fall Risk Advisory',
    alertMessage: 'Patient is experiencing dizziness and is at high risk of falling.',
    solutions: [
      'Help the patient lie flat safely with legs slightly elevated.',
      'Avoid sudden standing or head movements.',
      'Offer a glass of water with electrolytes or pinch of salt.',
      'Check blood pressure and blood glucose levels immediately.'
    ],
    recommendedDoctorSpecialty: 'General Physician'
  }
];

/**
 * Fallback analyzer when Gemini API is offline or unconfigured.
 */
function analyzeSymptomsOffline(query, activeSymptoms = []) {
  const combined = `${query} ${activeSymptoms.join(' ')}`.toLowerCase();

  for (const item of OFFLINE_CLINICAL_KNOWLEDGE) {
    if (item.keywords.some((kw) => combined.includes(kw))) {
      return item;
    }
  }

  // Generic fallback if no specific match
  return {
    condition: 'Nonspecific Physiological Distress / Malaise',
    curability: 'Manageable',
    isEmergency: false,
    alertTitle: 'ℹ️ Clinical Observation Needed',
    alertMessage: 'Symptoms warrant clinical review. Monitor vitals, temperature, and pulse.',
    solutions: [
      'Keep patient resting comfortably in a well-ventilated room.',
      'Monitor vital signs: pulse, blood pressure, and body temperature.',
      'Maintain mild oral hydration with water or soup.',
      'Schedule a consultation with a physician if symptoms do not improve within 24 hours.'
    ],
    recommendedDoctorSpecialty: 'General Physician'
  };
}

/**
 * Primary function to analyze symptoms, predict root cause, evaluate curability,
 * and provide solutions or dispatch alerts.
 *
 * @param {string} userQuery - The question or symptom description entered by user
 * @param {Array<string>} activeSymptoms - Currently active symptoms in patient record
 * @param {object} patientMeta - Patient metadata { name, age, language, medicines }
 * @returns {Promise<object>} Chatbot diagnostic result
 */
export async function analyzeSymptomsWithAi({
  userQuery = '',
  activeSymptoms = [],
  patientMeta = {}
}) {
  const offlineResult = analyzeSymptomsOffline(userQuery, activeSymptoms);
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  let diagnosticResult = null;

  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    const prompt = `You are an expert AI clinical triage assistant inside Sanjeevani healthcare app.
A patient or caregiver reports the following symptoms:
User Query: "${userQuery}"
Active Symptoms Recorded: [${activeSymptoms.join(', ')}]
Patient Demographics: Name: ${patientMeta.name || 'Patient'}, Age: ${patientMeta.age || 62}, Language: ${patientMeta.language || 'Hindi'}.
Active Medications: [${(patientMeta.medicines || []).map((m) => m.name).join(', ')}]

Analyze the root cause, determine curability, provide immediate home remedies if safe/curable, or alert caregiver/emergency if incurable/critical.
Return JSON ONLY (no markdown formatting, no code fences):
{
  "condition": "Likely root cause disease or physiological condition (e.g. Acute Angina, Viral Bronchitis, Acid Reflux)",
  "curability": "Curable" OR "Manageable" OR "Critical / Incurable at Home",
  "isEmergency": true/false,
  "alertTitle": "Short alert title for notification",
  "alertMessage": "Direct plain-language alert message explaining the root danger or summary",
  "solutions": [
    "Step 1 practical home first-aid remedy or care action",
    "Step 2 practical action",
    "Step 3 medical consultation instruction"
  ],
  "recommendedDoctorSpecialty": "e.g. Cardiologist, Pulmonologist, Neurologist, General Physician",
  "patientFriendlyAdvice": "A reassuring 2-sentence explanation addressed to patient and caregiver"
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.15, maxOutputTokens: 600 }
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        if (parsed.condition && parsed.curability) {
          diagnosticResult = {
            condition: parsed.condition,
            curability: parsed.curability,
            isEmergency: Boolean(parsed.isEmergency),
            alertTitle: parsed.alertTitle || 'AI Health Assessment',
            alertMessage: parsed.alertMessage || parsed.patientFriendlyAdvice || '',
            solutions: Array.isArray(parsed.solutions) ? parsed.solutions : offlineResult.solutions,
            recommendedDoctorSpecialty: parsed.recommendedDoctorSpecialty || offlineResult.recommendedDoctorSpecialty,
            patientFriendlyAdvice: parsed.patientFriendlyAdvice || ''
          };
        }
      }
    } catch (err) {
      console.warn('[aiChatbotService] Gemini API call error or timeout, using offline clinical knowledge:', err);
    }
  }

  // Use offline result if Gemini didn't complete
  if (!diagnosticResult) {
    diagnosticResult = {
      ...offlineResult,
      patientFriendlyAdvice: offlineResult.alertMessage
    };
  }

  // If this condition is an emergency or critical / incurable at home:
  // Automatically dispatch emergency / high-priority alert to patient & caregiver stream!
  if (diagnosticResult.isEmergency || diagnosticResult.curability.toLowerCase().includes('critical')) {
    try {
      await triggerEmergency();
      await setQuickAlert(`🚨 CRITICAL AI DIAGNOSIS: ${diagnosticResult.condition} (${diagnosticResult.recommendedDoctorSpecialty})`);
    } catch (e) {
      console.warn('[aiChatbotService] Could not auto-dispatch emergency alert:', e);
    }
  } else if (diagnosticResult.curability === 'Curable') {
    try {
      await setQuickAlert(`ℹ️ AI Recommendation: ${diagnosticResult.condition} (${diagnosticResult.curability})`);
    } catch (e) {
      console.warn('[aiChatbotService] Could not set quick alert:', e);
    }
  }

  return diagnosticResult;
}
