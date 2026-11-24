/**
 * medicineUtils.js - Pure Helpers for Medicine Scheduling, Daily Tracking, Adherence & Migration
 * Owner: Dev 3 (Medicines & Daily Tracking)
 *
 * Kept pure (no Firebase/DOM dependencies) for reliable unit testing and
 * consistent behavior across Medicines.jsx, MedicineCard.jsx, and patientService.js.
 */

export const SCHEDULE_TIME_OPTIONS = ['Morning', 'Afternoon', 'Night'];

export const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'As needed / Custom'
];

/**
 * Returns local calendar date as YYYY-MM-DD (avoids UTC midnight shift).
 * @param {Date} [dateObj]
 * @returns {string}
 */
export function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates a unique stable ID for a medicine or dose log.
 * Uses crypto.randomUUID when available, with a safe fallback.
 * @param {string} [prefix='med']
 * @returns {string}
 */
export function generateStableId(prefix = 'med') {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/**
 * Returns a deterministic fallback ID for legacy medicines that do not yet have a persisted `id`.
 * Index-independent so deleting another medicine does not change a legacy medicine's identity.
 * @param {object} med
 * @returns {string}
 */
export function getMedicineId(med) {
  if (med?.id) return med.id;
  const slugName = (med?.name || 'unknown').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const slugTime = (med?.time || 'morning').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `legacy_${slugName}_${slugTime}`;
}

/**
 * Extracts normalized scheduled times array from either Phase 2 (`times[]`) or legacy (`time` string) medicines.
 * @param {object} med
 * @returns {string[]}
 */
export function getMedicineTimes(med) {
  if (Array.isArray(med?.times) && med.times.length > 0) {
    return med.times.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof med?.time === 'string' && med.time.trim()) {
    const parts = med.time
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts;
  }
  return ['Morning'];
}

/**
 * Safely normalizes a medicine record (preserving all existing fields and adding non-destructive defaults).
 * @param {object} med
 * @returns {object}
 */
export function normalizeMedicine(med) {
  if (!med) return null;
  const times = getMedicineTimes(med);
  return {
    ...med,
    id: getMedicineId(med),
    name: (med.name || '').trim(),
    dosage: typeof med.dosage === 'string' ? med.dosage.trim() : '',
    frequency: typeof med.frequency === 'string' ? med.frequency.trim() : '',
    times,
    time: med.time || times.join(', '),
    instructions: typeof med.instructions === 'string' ? med.instructions.trim() : ''
  };
}

/**
 * Checks whether a specific scheduled dose (medicineId + scheduledTime) has an active 'taken' log on dateStr.
 * @param {Array} doseLogs
 * @param {string} medicineId
 * @param {string} scheduledTime
 * @param {string} dateStr
 * @returns {object|null} The active dose log or null
 */
export function findActiveDoseLog(doseLogs = [], medicineId, scheduledTime, dateStr) {
  return (
    doseLogs.find(
      (log) =>
        log.medicineId === medicineId &&
        log.scheduledTime === scheduledTime &&
        log.date === dateStr &&
        log.status === 'taken'
    ) || null
  );
}

/**
 * Calculates daily adherence metrics from scheduled medicines and dose logs for a given date.
 * Handles zero scheduled doses safely (returns 0% without division by zero).
 * Counts only active 'taken' logs that match currently scheduled doses so percentages never exceed 100%.
 *
 * @param {Array} medicines
 * @param {Array} doseLogs
 * @param {string} [dateStr]
 * @returns {{ totalScheduled: number, dosesTaken: number, dosesRemaining: number, percentage: number }}
 */
export function calculateDailyAdherence(medicines = [], doseLogs = [], dateStr = getLocalDateString()) {
  let totalScheduled = 0;
  let dosesTaken = 0;

  for (const med of medicines) {
    const medId = getMedicineId(med);
    const times = getMedicineTimes(med);
    for (const time of times) {
      totalScheduled += 1;
      if (findActiveDoseLog(doseLogs, medId, time, dateStr)) {
        dosesTaken += 1;
      }
    }
  }

  const dosesRemaining = Math.max(0, totalScheduled - dosesTaken);
  const percentage = totalScheduled === 0 ? 0 : Math.round((dosesTaken / totalScheduled) * 100);

  return {
    totalScheduled,
    dosesTaken,
    dosesRemaining,
    percentage
  };
}

/**
 * Returns historical dose logs (separate from today's active tracking, or all past/undone records)
 * sorted newest first.
 * @param {Array} doseLogs
 * @param {string} [todayStr]
 * @param {boolean} [includeToday=false]
 * @returns {Array}
 */
export function getHistoricalDoseLogs(doseLogs = [], todayStr = getLocalDateString(), includeToday = false) {
  return [...doseLogs]
    .filter((log) => (includeToday ? true : log.date !== todayStr || log.status === 'undone'))
    .sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.recordedAt || '').localeCompare(a.recordedAt || '');
    });
}
