/**
 * interactions.js - Drug Interaction Safety Engine
 * Owner: Dev 3 (Caregiver & Safety Engine)
 * 
 * Simple explanation:
 * Checks any combination of patient medicines against known dangerous pairs
 * and returns plain-language safety warnings before harmful combinations are taken.
 */

export const DANGEROUS_PAIRS = [
  // Core Required Pairs
  {
    drugs: ['Aspirin', 'Warfarin'],
    reason: 'Combining Aspirin and Warfarin significantly magnifies blood thinning, causing a severe risk of internal hemorrhage and stomach bleeding.'
  },
  {
    drugs: ['Ibuprofen', 'Aspirin'],
    reason: 'Taking Ibuprofen together with Aspirin increases the likelihood of stomach ulcers and diminishes Aspirin\'s cardioprotective benefits.'
  },
  {
    drugs: ['Paracetamol', 'Alcohol'],
    reason: 'Mixing Paracetamol with Alcohol places extreme acute strain on the liver, raising the risk of severe hepatotoxicity.'
  },
  {
    drugs: ['Metformin', 'Alcohol'],
    reason: 'Drinking alcohol while on Metformin can cause lactic acidosis, a dangerous build-up of lactic acid in the bloodstream.'
  },
  {
    drugs: ['Clopidogrel', 'Omeprazole'],
    reason: 'Omeprazole blocks the liver enzyme needed to activate Clopidogrel, making it much less effective at preventing blood clots.'
  },
  {
    drugs: ['Amlodipine', 'Simvastatin'],
    reason: 'Amlodipine increases Simvastatin concentrations in the body, which can trigger severe muscle breakdown (rhabdomyolysis).'
  },
  {
    drugs: ['Ibuprofen', 'Warfarin'],
    reason: 'Ibuprofen strongly irritates the digestive tract and amplifies Warfarin\'s anticoagulant effect, leading to high bleeding hazard.'
  },
  {
    drugs: ['Diclofenac', 'Aspirin'],
    reason: 'Using Diclofenac with Aspirin multiplies the risk of severe gastrointestinal erosion, ulceration, and kidney stress.'
  },
  // Expanded High-Risk Pairs
  {
    drugs: ['Tramadol', 'Escitalopram'],
    reason: 'Combining Tramadol with SSRI antidepressants like Escitalopram can trigger life-threatening Serotonin Syndrome and increase seizure risk.'
  },
  {
    drugs: ['Spironolactone', 'Ramipril'],
    reason: 'Using Spironolactone with ACE inhibitors like Ramipril can cause dangerously elevated potassium (hyperkalemia), risking fatal cardiac arrhythmia.'
  },
  {
    drugs: ['Digoxin', 'Amiodarone'],
    reason: 'Amiodarone doubles blood levels of Digoxin, frequently precipitating acute digitalis toxicity and severe bradycardia.'
  },
  {
    drugs: ['Fluconazole', 'Warfarin'],
    reason: 'Fluconazole potently inhibits Warfarin metabolism, causing rapid spikes in INR and severe uncontrolled bleeding.'
  },
  {
    drugs: ['Metronidazole', 'Alcohol'],
    reason: 'Metronidazole combined with alcohol provokes a severe disulfiram-like reaction with extreme vomiting, tachycardia, and collapse.'
  },
  {
    drugs: ['Ciprofloxacin', 'Theophylline'],
    reason: 'Ciprofloxacin inhibits Theophylline clearance, leading to toxic drug accumulation, tremors, heart palpitations, and seizures.'
  }
];

/**
 * Checks a list of medicine names against dangerous pairs.
 * @param {Array<string|object>} medicines - Array of medicine names or objects { name }
 * @returns {Array<string>} List of human-readable warning messages
 */
export function checkInteractions(medicines = []) {
  const names = medicines
    .map((m) => (typeof m === 'string' ? m : m?.name || ''))
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);

  const activeWarnings = [];

  for (const pair of DANGEROUS_PAIRS) {
    const drugA = pair.drugs[0].toLowerCase();
    const drugB = pair.drugs[1].toLowerCase();

    const hasDrugA = names.includes(drugA);
    const hasDrugB = names.includes(drugB);

    if (hasDrugA && hasDrugB) {
      activeWarnings.push(`⚠️ DANGEROUS COMBINATION: ${pair.drugs[0]} + ${pair.drugs[1]} — ${pair.reason}`);
    }
  }

  return activeWarnings;
}
