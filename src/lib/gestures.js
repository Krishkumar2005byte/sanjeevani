/**
 * gestures.js - MediaPipe Hand Gesture Recognition Logic
 * Owner: Dev 1 (Patient Experience & Accessibility)
 * 
 * Simple explanation:
 * Converts 21 3D hand landmarks from MediaPipe HandLandmarker into meaningful
 * non-verbal communication gestures for patients who cannot speak.
 * 
 * Supported Non-Verbal Gestures:
 * 1. Open Palm (🖐️)   -> Hand detected / Ready for gesture input
 * 2. Thumbs Up (👍)   -> Confirm / Select highlighted symptom
 * 3. Thumbs Down (👎) -> Skip / Move past highlighted symptom (never triggers Emergency)
 * 4. Pointing Up (☝️) -> Highlight next symptom
 * 5. Peace Sign (✌️)  -> Call Doctor
 * 6. Closed Fist (✊) -> Emergency Help / Severe Pain
 */

export const GESTURE_DEFINITIONS = {
  open_palm: {
    id: 'open_palm',
    name: 'Open Palm',
    emoji: '🖐️',
    label: 'Hand Detected · Ready',
    spoken: '',
    urgency: 'Low',
    action: 'hand_detected'
  },
  thumbs_up: {
    id: 'thumbs_up',
    name: 'Thumbs Up',
    emoji: '👍',
    label: 'Confirm / Select Highlighted Symptom',
    spoken: '',
    urgency: 'Low',
    action: 'confirm_symptom'
  },
  thumbs_down: {
    id: 'thumbs_down',
    name: 'Thumbs Down',
    emoji: '👎',
    label: 'Skip / Not This Symptom',
    spoken: '',
    urgency: 'Low',
    action: 'next_symptom'
  },
  pointing_up: {
    id: 'pointing_up',
    name: 'Pointing Index',
    emoji: '☝️',
    label: 'Highlight Next Symptom',
    spoken: '',
    urgency: 'Low',
    action: 'next_symptom'
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
    label: 'Emergency Help / Severe Pain',
    spoken: 'आपातकालीन सहायता की आवश्यकता है! बहुत दर्द है!',
    urgency: 'High',
    action: 'emergency'
  }
};

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Classifies 21 MediaPipe hand landmarks into a recognized gesture.
 * Uses palm-size-normalized distances so detection works regardless of camera distance.
 *
 * Landmark Indices (MediaPipe standard):
 * 0: Wrist
 * 2: Thumb MCP, 3: Thumb IP, 4: Thumb tip
 * 5: Index MCP, 6: Index PIP, 8: Index tip
 * 9: Middle MCP, 10: Middle PIP, 12: Middle tip
 * 13: Ring MCP, 14: Ring PIP, 16: Ring tip
 * 17: Pinky MCP, 18: Pinky PIP, 20: Pinky tip
 */
export function classifyHandLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  const wrist = landmarks[0];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const pinkyMcp = landmarks[17];

  const palmSize = distance2D(wrist, middleMcp);
  if (palmSize < 0.02) {
    return null;
  }

  // A finger is extended when its tip is clearly farther from the wrist & MCP than its PIP joint
  const isFingerExtended = (mcpIdx, pipIdx, tipIdx) => {
    const tipToWrist = distance2D(landmarks[tipIdx], wrist);
    const pipToWrist = distance2D(landmarks[pipIdx], wrist);
    const tipToMcp = distance2D(landmarks[tipIdx], landmarks[mcpIdx]);
    const pipToMcp = distance2D(landmarks[pipIdx], landmarks[mcpIdx]);
    return tipToWrist > pipToWrist * 1.12 && tipToMcp > pipToMcp * 1.05;
  };

  // A finger is curled when its tip sits close to the wrist/palm
  const isFingerCurled = (mcpIdx, pipIdx, tipIdx) => {
    const tipToWrist = distance2D(landmarks[tipIdx], wrist);
    const pipToWrist = distance2D(landmarks[pipIdx], wrist);
    const tipToMcp = distance2D(landmarks[tipIdx], landmarks[mcpIdx]);
    return tipToWrist <= pipToWrist * 1.05 || tipToMcp < palmSize * 0.65;
  };

  const indexExtended = isFingerExtended(5, 6, 8);
  const middleExtended = isFingerExtended(9, 10, 12);
  const ringExtended = isFingerExtended(13, 14, 16);
  const pinkyExtended = isFingerExtended(17, 18, 20);

  const indexCurled = isFingerCurled(5, 6, 8);
  const middleCurled = isFingerCurled(9, 10, 12);
  const ringCurled = isFingerCurled(13, 14, 16);
  const pinkyCurled = isFingerCurled(17, 18, 20);

  const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
  const curledCount = [indexCurled, middleCurled, ringCurled, pinkyCurled].filter(Boolean).length;

  const thumbOut = distance2D(thumbTip, pinkyMcp) > distance2D(thumbIp, pinkyMcp) * 1.08 &&
    distance2D(thumbTip, indexMcp) > palmSize * 0.42;

  // 1. Open Palm: all 4 fingers + thumb extended
  if (extendedCount === 4 && thumbOut) {
    return GESTURE_DEFINITIONS.open_palm;
  }

  // 2. Thumbs Up vs Thumbs Down (checked BEFORE Closed Fist so thumbs down never triggers emergency)
  if (curledCount >= 3 && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const thumbLift = thumbMcp.y - thumbTip.y; // positive = pointing UP, negative = pointing DOWN
    const thumbAwayFromIndex = distance2D(thumbTip, indexMcp) > palmSize * 0.42;

    // Thumbs Up: thumb tip clearly above thumb IP & MCP
    if (thumbAwayFromIndex && thumbTip.y < thumbIp.y && thumbLift > palmSize * 0.25) {
      return GESTURE_DEFINITIONS.thumbs_up;
    }

    // Thumbs Down: thumb tip clearly below thumb IP & MCP
    if (thumbAwayFromIndex && thumbTip.y > thumbIp.y && -thumbLift > palmSize * 0.25) {
      return GESTURE_DEFINITIONS.thumbs_down;
    }

    // 3. Closed Fist (Emergency): all 4 fingers curled AND thumb tucked close to palm/fingers
    const thumbTucked =
      curledCount === 4 &&
      Math.abs(thumbLift) < palmSize * 0.35 &&
      distance2D(thumbTip, middleMcp) < palmSize * 0.85;

    if (thumbTucked) {
      return GESTURE_DEFINITIONS.fist;
    }
  }

  // 4. Pointing Up: only index finger extended
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return GESTURE_DEFINITIONS.pointing_up;
  }

  // 5. Peace Sign: index & middle extended, ring & pinky curled
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return GESTURE_DEFINITIONS.peace_sign;
  }

  return null;
}
