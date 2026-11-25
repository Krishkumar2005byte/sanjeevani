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
 * - Works online via Google Gemini API (gemini-1.5-flash) with an extensive offline
 *   clinical rule-based fallback matrix.
 */

import { triggerEmergency, setQuickAlert } from './patientService.js';

// Comprehensive offline clinical knowledge base for zero-config mode
export const OFFLINE_CLINICAL_KNOWLEDGE = [
  {
    keywords: ['chest', 'heart', 'arm', 'jaw', 'sweating', 'cardiac', 'left arm', 'heaviness', 'pressure in chest'],
    condition: 'Suspected Angina Pectoris / Acute Coronary Syndrome',
    curability: 'Critical / Incurable at Home',
    isEmergency: true,
    alertTitle: '🚨 CRITICAL CARDIAC WARNING',
    alertMessage: 'Symptoms indicate potential cardiac ischemia or heart attack. Do not attempt home remedies. Immediate emergency medical response required.',
    solutions: [
      'Have patient sit upright and rest immediately; avoid any physical exertion or walking.',
      'Loosen tight clothing around the neck, collar, and chest to ease breathing.',
      'Check if patient has prescribed sublingual Nitroglycerin or Aspirin from their cardiologist.',
      'Call emergency ambulance (108 / 112) or reach the nearest cardiac emergency room immediately.'
    ],
    recommendedDoctorSpecialty: 'Cardiologist'
  },
  {
    keywords: ['breath', 'breathing', 'wheez', 'suffocat', 'air', 'asthma', 'shortness of breath', 'choking'],
    condition: 'Acute Respiratory Distress / Bronchospasm',
    curability: 'Critical / Incurable at Home',
    isEmergency: true,
    alertTitle: '🚨 CRITICAL RESPIRATORY WARNING',
    alertMessage: 'Severe breathing difficulty can lead to rapid hypoxia. Immediate oxygen or clinical bronchodilator therapy is required.',
    solutions: [
      'Sit patient in a high Fowler (upright leaning slightly forward) position.',
      'Administer prescribed rescue inhaler (e.g. Salbutamol / Albuterol / Budecort) immediately.',
      'Ensure room has open ventilation, unblocked windows, and fresh airflow.',
      'Seek emergency hospitalization if lips or nails turn bluish or breathing remains labored.'
    ],
    recommendedDoctorSpecialty: 'Pulmonologist'
  },
  {
    keywords: ['fever', 'chills', 'temperature', 'shiver', 'pyrexia', 'body pain', 'hot body'],
    condition: 'Acute Febrile Illness / Viral Infection or Malaria',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '⚠️ Moderate Illness Alert',
    alertMessage: 'High body temperature requires regular monitoring, cold sponging, and hydration.',
    solutions: [
      'Lukewarm Water Sponging: Apply damp cloth compresses across forehead, neck, and armpits.',
      'Continuous Oral Hydration: Drink plenty of water, coconut water, electral, or ORS in small sips.',
      'Antipyretic Care: Administer Paracetamol (500mg-650mg) every 6-8 hours if body temperature exceeds 100.4°F.',
      'Wear light, breathable cotton clothing and avoid heavy blankets that trap heat.',
      'Consult a General Physician if fever persists over 48 hours or is accompanied by rash or neck stiffness.'
    ],
    recommendedDoctorSpecialty: 'General Physician'
  },
  {
    keywords: ['headache', 'head', 'migraine', 'throbbing', 'light', 'temple', 'scalp', 'sev', 'severe headache'],
    condition: 'Migraine / Acute Tension Cephalea',
    curability: 'Curable / Manageable',
    isEmergency: false,
    alertTitle: '💆 Neurological Rest & Relief Recommended',
    alertMessage: 'Tension headache or migraine triggered by vascular dilation, stress, eye strain, or dehydration.',
    solutions: [
      'Dark Room Rest: Lie down in a cool, quiet, darkened room away from phone/TV screens and noise.',
      'Cold / Warm Compress: Apply an ice pack wrapped in a cloth to the forehead or warm cloth to the neck.',
      'Hydration & Caffeine: Drink 500ml of fresh water; a small cup of warm ginger tea or coffee can relieve vascular headache.',
      'Gentle Temple Massage: Light circular massage on temples and base of the skull with peppermint or eucalyptus balm.',
      'Over-the-counter relief: Paracetamol or Ibuprofen if safe and prescribed by your physician.'
    ],
    recommendedDoctorSpecialty: 'Neurologist'
  },
  {
    keywords: ['washroom', 'urine', 'toilet', 'bladder', 'urinary', 'burning sensation in urine', 'dysuria', 'pee'],
    condition: 'Urinary Tract Infection (UTI) / Bladder Urgency',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '🚻 Urinary Comfort & Assistance Needed',
    alertMessage: 'Bacterial irritation of the bladder or urethra causing frequent painful urgency.',
    solutions: [
      'Provide immediate physical support or walking aid to the washroom to prevent accidental falls.',
      'High Volume Hydration: Drink 2 to 3 liters of water throughout the day to naturally flush the urinary tract.',
      'Cranberry Extract / Alkalizing Liquid: Drink unsweetened cranberry juice or dilute disodium hydrogen citrate syrup in water.',
      'Avoid bladder irritants: Cut out caffeine, alcohol, artificial sweeteners, and spicy foods.',
      'Consult a Urologist or General Physician for a urine routine test and targeted antibiotic prescription.'
    ],
    recommendedDoctorSpecialty: 'Urologist'
  },
  {
    keywords: ['stomach', 'acid', 'acid reflux', 'heartburn', 'gastric', 'cramp', 'indigestion', 'gas', 'bloat', 'belly pain'],
    condition: 'Gastroesophageal Reflux (GERD) / Acute Gastritis',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '🍲 Gastric Distress & Acid Reflux Relief',
    alertMessage: 'Excess gastric acid irritating esophageal lining, commonly triggered by spicy food, irregular meals, or stress.',
    solutions: [
      'Elevate Head & Torso: Keep upper body elevated at 30-45 degrees; do not lie flat for at least 2 hours after meals.',
      'Immediate Antacid: Sip half a glass of cold milk, or take an antacid gel (e.g. Digene, Gelusil) or chewable antacid.',
      'Warm Cumin / Fennel Water: Boil 1 tsp of jeera (cumin) or saunf (fennel) in water and drink lukewarm for rapid gas relief.',
      'Avoid triggers: Avoid fried snacks, spicy chillies, citrus, carbonated drinks, and smoking.',
      'Consult a Gastroenterologist if abdominal pain is sharp and radiating or causes dark stool.'
    ],
    recommendedDoctorSpecialty: 'Gastroenterologist'
  },
  {
    keywords: ['cough', 'cold', 'sore throat', 'throat irritation', 'phlegm', 'mucus', 'sneeze', 'runny nose', 'congestion'],
    condition: 'Upper Respiratory Tract Infection / Common Cold & Pharyngitis',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '🧣 Respiratory Soothing & Throat Care',
    alertMessage: 'Viral upper airway inflammation causing mucus hypersecretion and throat irritation.',
    solutions: [
      'Warm Salt Water Gargle: Gargle with warm saline water (1/2 tsp salt in 1 glass warm water) 3-4 times a day.',
      'Steam Inhalation: Inhale steam for 5-10 minutes with a drop of eucalyptus oil or mint to open nasal airways.',
      'Honey & Ginger Tea: Take 1 spoon of pure honey with grated ginger juice twice daily to calm throat spasms.',
      'Elevate Pillows: Sleep with double pillows to prevent nocturnal post-nasal drip and coughing spells.',
      'Consult a General Physician or ENT specialist if throat pain causes difficulty swallowing saliva.'
    ],
    recommendedDoctorSpecialty: 'General Physician'
  },
  {
    keywords: ['diarrhea', 'loose', 'motion', 'vomit', 'vomiting', 'food poisoning', 'nausea', 'dysentery', 'upset stomach'],
    condition: 'Acute Gastroenteritis / Dehydration Risk',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '💧 Fluid Replacement & Gut Recovery',
    alertMessage: 'Intestinal irritation with fluid loss. Immediate rehydration protocol must be initiated.',
    solutions: [
      'ORS (Oral Rehydration Salts): Dissolve 1 sachet ORS in 1 liter clean boiled water; sip continuously after each episode.',
      'BRAT / Bland Diet: Consume boiled rice with curd (rich in natural probiotics), boiled potatoes, toast, and ripe bananas.',
      'Avoid Dairy & Oily Food: Strictly avoid milk, spicy gravies, fried snacks, and raw unwashed salads.',
      'Zinc Supplementation: Take zinc supplements or prebiotic capsules as advised by doctor.',
      'Seek immediate clinical attention if blood appears in stool or if vomiting prevents fluid retention.'
    ],
    recommendedDoctorSpecialty: 'Gastroenterologist'
  },
  {
    keywords: ['water', 'thirst', 'dry', 'dehydrat', 'throat', 'parched'],
    condition: 'Acute Dehydration & Hypovolemia Risk',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '💧 Hydration Protocol Needed',
    alertMessage: 'Cellular and electrolyte deficit causing dry mucous membranes, fatigue, and lightheadedness.',
    solutions: [
      'Immediate Oral Fluids: Drink 200-300ml of clean drinking water, coconut water, or lemonade with a pinch of black salt.',
      'Electrolyte Balance: Sip Oral Rehydration Solution (ORS) slowly over 30 minutes.',
      'Cool Environment: Sit in a well-ventilated, shaded or air-conditioned room to minimize sweat loss.',
      'Check vitals: Inspect tongue moisture, urine color (pale yellow is healthy), and sitting-to-standing dizziness.'
    ],
    recommendedDoctorSpecialty: 'General Physician'
  },
  {
    keywords: ['dizzy', 'faint', 'spinning', 'vertigo', 'lightheaded', 'unsteady', 'imbalance'],
    condition: 'Postural Hypotension / Benign Positional Vertigo',
    curability: 'Curable / Manageable',
    isEmergency: false,
    alertTitle: '⚠️ Fall Risk & Vestibular Advisory',
    alertMessage: 'Transient drop in cerebral blood flow or inner ear vestibular disturbance. High risk of falling.',
    solutions: [
      'Lie Down Safely: Immediately sit or lie flat on back with legs slightly elevated on a pillow.',
      'Avoid Sudden Motions: When getting up, pause in a sitting position for 60 seconds before standing up.',
      'Electrolyte & Salt Intake: Drink a glass of water containing a pinch of rock salt or glucose to support vascular tone.',
      'Check vitals: Measure blood pressure and fingerstick glucose levels to rule out hypoglycemia or hypertension.',
      'Consult an ENT or Neurologist if spinning is triggered by head turns or lasts longer than 15 minutes.'
    ],
    recommendedDoctorSpecialty: 'ENT / Neurologist'
  },
  {
    keywords: ['back', 'spine', 'waist', 'lumbar', 'spasm', 'stiff', 'sciatica', 'backache'],
    condition: 'Acute Musculoskeletal Lumbar Strain',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '🧘 Lumbar Relief & Postural Care',
    alertMessage: 'Mechanical muscle spasm or ligamentous strain in the lower back.',
    solutions: [
      'Rest in Ergonomic Position: Lie on a firm mattress on your side with a pillow between knees to relieve spinal pressure.',
      'Cold / Warm Therapy: Apply an ice pack for 15 minutes during the first 24 hours, followed by warm water bottle compresses.',
      'Topical Relief: Gently apply pain relief gel (containing Diclofenac or herbal Wintergreen oil) without vigorous rubbing.',
      'Avoid lifting heavy loads, twisting spine, or slouching in soft sofas.',
      'Consult an Orthopedic or Physiotherapist if pain shoots down the leg past the knee.'
    ],
    recommendedDoctorSpecialty: 'Orthopedic / Physiotherapist'
  },
  {
    keywords: ['allergy', 'itching', 'rash', 'hives', 'skin', 'redness', 'scratch'],
    condition: 'Acute Urticaria / Allergic Dermatitis',
    curability: 'Curable',
    isEmergency: false,
    alertTitle: '🌸 Cutaneous Allergic Reaction',
    alertMessage: 'Histamine release in skin tissue triggered by contact, medication, or food allergen.',
    solutions: [
      'Cool Compress: Apply clean, cold water damp cloths to itchy areas to soothe burning nerve endings.',
      'Calamine Lotion: Apply soothing calamine lotion or pure aloe vera gel liberally over rashes.',
      'Wear Loose Cotton: Change into loose-fitting, soft cotton clothes; avoid wool or synthetic fabrics.',
      'Antihistamine: An over-the-counter Cetirizine (10mg) or Levocetirizine can quickly suppress histamine if suitable.',
      '🚨 EMERGENCY WARNING: If itching spreads to the throat, tongue, or causes breathing difficulty, rush to ER for anaphylaxis treatment.'
    ],
    recommendedDoctorSpecialty: 'Dermatologist'
  },
  {
    keywords: ['sugar', 'glucose', 'shaking', 'sweat', 'tremor', 'diabetic', 'hypoglycemia'],
    condition: 'Acute Hypoglycemia (Low Blood Sugar)',
    curability: 'Curable Immediately',
    isEmergency: false,
    alertTitle: '🍬 Quick Glucose Intervention Needed',
    alertMessage: 'Blood glucose has dropped below normal levels (<70 mg/dL). Immediate fast-acting carbohydrate needed.',
    solutions: [
      'The "Rule of 15": Immediately consume 15 grams of fast-acting sugar (half glass fruit juice, 3 sugar candies, or 1 tbsp honey).',
      'Rest Quietly: Sit safely for 15 minutes without walking or exertion.',
      'Re-check Glucose: Re-check blood sugar after 15 minutes. If still below 70 mg/dL, repeat another 15g sugar.',
      'Follow-up Snack: Once blood sugar rises, eat a balanced carbohydrate meal (e.g. roti, bread, or crackers) to prevent relapse.'
    ],
    recommendedDoctorSpecialty: 'Endocrinologist'
  },
  {
    keywords: ['bp', 'hypertension', 'high pressure', 'blood pressure'],
    condition: 'Hypertensive Episode / Vascular Elevation',
    curability: 'Manageable',
    isEmergency: false,
    alertTitle: '🩺 Blood Pressure Management Alert',
    alertMessage: 'Elevated arterial pressure detected. Requires calm environment and compliance check.',
    solutions: [
      'Quiet Rest: Sit calmly in a supportive chair with feet flat on the floor; practice slow deep breathing for 5 minutes.',
      'Medication Compliance: Check whether regular prescribed anti-hypertensive tablets were taken on schedule today.',
      'Sodium Restriction: Avoid salty foods, pickles, processed snacks, and tea/coffee.',
      'Re-measure BP in 15-20 minutes. If systolic BP is >180 mmHg or diastolic >120 mmHg, seek immediate medical attention.'
    ],
    recommendedDoctorSpecialty: 'Cardiologist / Physician'
  }
];

/**
 * Fallback analyzer when Gemini API is offline or unconfigured.
 */
function analyzeSymptomsOffline(query = '', activeSymptoms = []) {
  const cleanQuery = typeof query === 'string' ? query : '';
  const cleanSymptoms = Array.isArray(activeSymptoms)
    ? activeSymptoms.map((s) => (typeof s === 'string' ? s : s?.label || s?.name || '')).join(' ')
    : '';
  const combined = `${cleanQuery} ${cleanSymptoms}`.toLowerCase();

  for (const item of OFFLINE_CLINICAL_KNOWLEDGE) {
    if (item.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      return item;
    }
  }

  // Generic fallback if no specific match
  return {
    condition: 'General Physiological Fatigue & Malaise',
    curability: 'Curable with Rest & Care',
    isEmergency: false,
    alertTitle: 'ℹ️ Clinical Rest & Observation Advised',
    alertMessage: 'Symptoms warrant gentle home care, hydration, and monitoring of baseline vitals.',
    solutions: [
      'Ensure 7-8 hours of uninterrupted rest in a comfortable, well-ventilated room.',
      'Maintain mild oral hydration with warm water, herbal teas, or clear broths.',
      'Monitor vital signs: pulse, blood pressure, and body temperature twice daily.',
      'Schedule a consultation with a General Physician if fatigue or symptoms persist beyond 24-48 hours.'
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
Active Symptoms Recorded: [${Array.isArray(activeSymptoms) ? activeSymptoms.join(', ') : ''}]
Patient Demographics: Name: ${patientMeta.name || 'Patient'}, Age: ${patientMeta.age || 62}, Language: ${patientMeta.language || 'Hindi'}.
Active Medications: [${(patientMeta.medicines || []).map((m) => m?.name || '').filter(Boolean).join(', ')}]

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
            solutions: Array.isArray(parsed.solutions) && parsed.solutions.length > 0 ? parsed.solutions : offlineResult.solutions,
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

  // Ensure solutions is always a non-empty array
  if (!Array.isArray(diagnosticResult.solutions) || diagnosticResult.solutions.length === 0) {
    diagnosticResult.solutions = offlineResult.solutions;
  }

  // If this condition is an emergency or critical / incurable at home:
  // Safely dispatch emergency / high-priority alert to patient & caregiver stream without failing
  try {
    if (diagnosticResult.isEmergency || (typeof diagnosticResult.curability === 'string' && diagnosticResult.curability.toLowerCase().includes('critical'))) {
      await triggerEmergency();
      await setQuickAlert(`🚨 CRITICAL AI DIAGNOSIS: ${diagnosticResult.condition} (${diagnosticResult.recommendedDoctorSpecialty})`);
    } else if (diagnosticResult.curability === 'Curable' || (typeof diagnosticResult.curability === 'string' && diagnosticResult.curability.toLowerCase().includes('curable'))) {
      await setQuickAlert(`ℹ️ AI Recommendation: ${diagnosticResult.condition} (${diagnosticResult.curability})`);
    }
  } catch (e) {
    console.warn('[aiChatbotService] Safe alert dispatch non-blocking notice:', e);
  }

  return diagnosticResult;
}
