/**
 * gestures.js - MediaPipe Hand Gesture Recognition Logic
 * Owner: Dev 1 (Patient Experience & Accessibility)
 * 
 * Simple explanation:
 * Converts 21 3D hand landmarks from MediaPipe Hand tracking into meaningful
 * non-verbal communication gestures for patients who cannot speak.
 * 
 * Supported Non-Verbal Gestures:
 * 1. Open Palm (🖐️)   -> "Call Caregiver / Help"
 * 2. Thumbs Up (👍)   -> "Yes / I'm Okay"
 * 3. Thumbs Down (👎) -> "No / Not Okay"
 * 4. Pointing Up (☝️)  -> "Need Water / Washroom"
 * 5. Peace Sign (✌️)  -> "Call Doctor"
 * 6. Closed Fist (✊) -> "Emergency / Severe Pain"
 */

export const GESTURE_DEFINITIONS = {
  open_palm: {
    id: 'open_palm',
    name: 'Open Palm',
    emoji: '🖐️',
    label: 'Help / Call Caregiver',
    spoken: 'कृपया मेरी मदद करें',
    urgency: 'Medium',
    action: 'help'
  },
  thumbs_up: {
    id: 'thumbs_up',
    name: 'Thumbs Up',
    emoji: '👍',
    label: 'Yes / I am okay',
    spoken: 'हाँ, सब ठीक है',
    urgency: 'Low',
    action: 'yes'
  },
  thumbs_down: {
    id: 'thumbs_down',
    name: 'Thumbs Down',
    emoji: '👎',
    label: 'No / Need attention',
    spoken: 'नहीं, ठीक नहीं है',
    urgency: 'Medium',
    action: 'no'
  },
  pointing_up: {
    id: 'pointing_up',
    name: 'Pointing Index',
    emoji: '☝️',
    label: 'Need Water / Washroom',
    spoken: 'मुझे पानी या वॉशरूम की आवश्यकता है',
    urgency: 'Medium',
    action: 'water'
  },
  peace_sign: {
    id: 'peace_sign',
    name: 'Peace Sign (V)',
    emoji: '✌️',
    label: 'Call Doctor',
    spoken: 'कृपया डॉक्टर को बुलाएं',
    urgency: 'Medium',
    action: 'doctor'
  },
  fist: {
    id: 'fist',
    name: 'Closed Fist',
    emoji: '✊',
    label: 'Emergency / Severe Pain',
    spoken: 'आपातकालीन सहायता की आवश्यकता है! बहुत दर्द है!',
    urgency: 'High',
    action: 'emergency'
  }
};

/**
 * Classifies 21 hand landmarks into a recognized gesture.
 * 
 * Landmark Indices (MediaPipe standard):
 * 0: Wrist
 * 4: Thumb tip
 * 8: Index tip, 6: Index PIP
 * 12: Middle tip, 10: Middle PIP
 * 16: Ring tip, 14: Ring PIP
 * 20: Pinky tip, 18: Pinky PIP
 */
export function classifyHandLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  // Helper: check if a finger is extended (tip is above PIP in inverted Y screen coordinates)
  const isExtended = (tipIdx, pipIdx) => landmarks[tipIdx].y < landmarks[pipIdx].y;

  const thumbExtended = landmarks[4].y < landmarks[3].y;
  const indexExtended = isExtended(8, 6);
  const middleExtended = isExtended(12, 10);
  const ringExtended = isExtended(16, 14);
  const pinkyExtended = isExtended(20, 18);

  const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

  // 1. Open Palm: all fingers extended
  if (extendedCount >= 4 && thumbExtended) {
    return GESTURE_DEFINITIONS.open_palm;
  }

  // 2. Closed Fist: no fingers extended
  if (extendedCount === 0 && !thumbExtended) {
    return GESTURE_DEFINITIONS.fist;
  }

  // 3. Thumbs Up: only thumb extended upward
  if (extendedCount === 0 && landmarks[4].y < landmarks[2].y && landmarks[4].y < landmarks[0].y) {
    return GESTURE_DEFINITIONS.thumbs_up;
  }

  // 4. Thumbs Down: only thumb pointing downward
  if (extendedCount === 0 && landmarks[4].y > landmarks[2].y) {
    return GESTURE_DEFINITIONS.thumbs_down;
  }

  // 5. Pointing Up: only index finger extended
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return GESTURE_DEFINITIONS.pointing_up;
  }

  // 6. Peace Sign: index & middle extended
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return GESTURE_DEFINITIONS.peace_sign;
  }

  return null;
}
