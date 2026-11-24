/**
 * gestures.js - Real-Time MediaPipe 8-Gesture -> 8-Problem Mapping
 * Owner: Dev 1 & Member 4 (UI / Gesture Set of 8)
 *
 * Each of the 8 camera-tracking patient hand gestures is assigned 1-to-1 to a specific problem:
 * 1. Open Palm              -> Breathing Trouble (Red / High Alert)
 * 2. Clenched Fist          -> Chest Pain (Red / High Alert)
 * 3. Thumbs Up              -> High Fever (Orange / Medium Alert)
 * 4. Thumbs Down            -> Dizziness (Orange / Medium Alert)
 * 5. Index Finger Point     -> Headache (Orange / Medium Alert)
 * 6. V-Sign (Victory/Peace) -> Nausea (Orange / Medium Alert)
 * 7. “Okay” Sign (Ring)     -> Body Pain (Orange / Medium Alert)
 * 8. Pinch Gesture          -> Need Water (Green / Low Routine)
 */

export const GESTURE_DEFINITIONS = {
  open_palm: {
    id: 'open_palm',
    number: 1,
    name: 'Open Palm',
    shortName: '1. Open Palm',
    emoji: '🖐️',
    symptomId: 'breathing-trouble',
    problemName: 'Breathing Trouble',
    label: 'Breathing Trouble · Red Alert',
    spoken: 'सांस लेने में तकलीफ़ हो रही है',
    urgency: 'High',
    action: 'symptom'
  },
  fist: {
    id: 'fist',
    number: 2,
    name: 'Clenched Fist',
    shortName: '2. Clenched Fist',
    emoji: '✊',
    symptomId: 'chest-pain',
    problemName: 'Chest Pain',
    label: 'Chest Pain · Red Alert',
    spoken: 'सीने में दर्द हो रहा है',
    urgency: 'High',
    action: 'symptom'
  },
  thumbs_up: {
    id: 'thumbs_up',
    number: 3,
    name: 'Thumbs Up',
    shortName: '3. Thumbs Up',
    emoji: '👍',
    symptomId: 'high-fever',
    problemName: 'High Fever',
    label: 'High Fever · Orange Alert',
    spoken: 'मुझे तेज़ बुखार है',
    urgency: 'Medium',
    action: 'symptom'
  },
  thumbs_down: {
    id: 'thumbs_down',
    number: 4,
    name: 'Thumbs Down',
    shortName: '4. Thumbs Down',
    emoji: '👎',
    symptomId: 'dizziness',
    problemName: 'Dizziness',
    label: 'Dizziness · Orange Alert',
    spoken: 'मुझे चक्कर आ रहे हैं',
    urgency: 'Medium',
    action: 'symptom'
  },
  pointing_up: {
    id: 'pointing_up',
    number: 5,
    name: 'Index Finger Point',
    shortName: '5. Index Point',
    emoji: '☝️',
    symptomId: 'headache',
    problemName: 'Headache',
    label: 'Headache · Orange Alert',
    spoken: 'मुझे सिरदर्द हो रहा है',
    urgency: 'Medium',
    action: 'symptom'
  },
  peace_sign: {
    id: 'peace_sign',
    number: 6,
    name: 'V-Sign (Peace)',
    shortName: '6. V-Sign',
    emoji: '✌️',
    symptomId: 'nausea',
    problemName: 'Nausea',
    label: 'Nausea · Orange Alert',
    spoken: 'मेरा जी मिचला रहा है',
    urgency: 'Medium',
    action: 'symptom'
  },
  ok_sign: {
    id: 'ok_sign',
    number: 7,
    name: '“Okay” Sign (Ring)',
    shortName: '7. Okay Sign',
    emoji: '👌',
    symptomId: 'body-pain',
    problemName: 'Body Pain',
    label: 'Body Pain · Orange Alert',
    spoken: 'मुझे बदन दर्द हो रहा है',
    urgency: 'Medium',
    action: 'symptom'
  },
  pinch: {
    id: 'pinch',
    number: 8,
    name: 'Pinch Gesture',
    shortName: '8. Pinch',
    emoji: '🤏',
    symptomId: 'need-water',
    problemName: 'Need Water',
    label: 'Need Water · Routine',
    spoken: 'मुझे पानी चाहिए',
    urgency: 'Low',
    action: 'symptom'
  }
};

export function getGestureForSymptom(symptomId) {
  return (
    Object.values(GESTURE_DEFINITIONS).find((g) => g.symptomId === symptomId) || null
  );
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Classifies 21 MediaPipe hand landmarks into one of the 8 supported patient gestures.
 * Uses palm-size-normalized distances so detection works cleanly across camera distances.
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
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];
  const middleMcp = landmarks[9];
  const pinkyMcp = landmarks[17];

  const palmSize = distance2D(wrist, middleMcp);
  if (palmSize < 0.02) {
    return null;
  }

  const isFingerExtended = (mcpIdx, pipIdx, tipIdx) => {
    const tipToWrist = distance2D(landmarks[tipIdx], wrist);
    const pipToWrist = distance2D(landmarks[pipIdx], wrist);
    const tipToMcp = distance2D(landmarks[tipIdx], landmarks[mcpIdx]);
    const pipToMcp = distance2D(landmarks[pipIdx], landmarks[mcpIdx]);
    return tipToWrist > pipToWrist * 1.12 && tipToMcp > pipToMcp * 1.05;
  };

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

  const thumbOut =
    distance2D(thumbTip, pinkyMcp) > distance2D(thumbIp, pinkyMcp) * 1.08 &&
    distance2D(thumbTip, indexMcp) > palmSize * 0.42;

  const thumbIndexDist = distance2D(thumbTip, indexTip);
  const indexForwardFromPalm = distance2D(indexTip, wrist) > distance2D(indexPip, wrist) * 0.9;

  // 7. "Okay" Sign (Ring Gesture): Thumb & Index tips form a ring, Middle + Ring + Pinky extended
  if (
    thumbIndexDist < palmSize * 0.38 &&
    middleExtended &&
    ringExtended &&
    pinkyExtended
  ) {
    return GESTURE_DEFINITIONS.ok_sign;
  }

  // 8. Pinch Gesture (Thumb & Index): Thumb & Index tips close/pinched forward, other 3 fingers curled
  if (
    thumbIndexDist < palmSize * 0.36 &&
    indexForwardFromPalm &&
    middleCurled &&
    ringCurled &&
    pinkyCurled &&
    distance2D(thumbTip, middleMcp) > palmSize * 0.52
  ) {
    return GESTURE_DEFINITIONS.pinch;
  }

  // 1. Open Palm: all 4 fingers + thumb extended
  if (extendedCount === 4 && thumbOut) {
    return GESTURE_DEFINITIONS.open_palm;
  }

  // 3, 4, 2: Thumbs Up / Thumbs Down / Clenched Fist
  if (curledCount >= 3 && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const thumbLift = thumbMcp.y - thumbTip.y;
    const thumbAwayFromIndex = distance2D(thumbTip, indexMcp) > palmSize * 0.42;

    if (thumbAwayFromIndex && thumbTip.y < thumbIp.y && thumbLift > palmSize * 0.25) {
      return GESTURE_DEFINITIONS.thumbs_up;
    }

    if (thumbAwayFromIndex && thumbTip.y > thumbIp.y && -thumbLift > palmSize * 0.25) {
      return GESTURE_DEFINITIONS.thumbs_down;
    }

    const thumbTucked =
      curledCount === 4 &&
      Math.abs(thumbLift) < palmSize * 0.35 &&
      distance2D(thumbTip, middleMcp) < palmSize * 0.85;

    if (thumbTucked) {
      return GESTURE_DEFINITIONS.fist;
    }
  }

  // 5. Index Finger Point: only index finger extended
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return GESTURE_DEFINITIONS.pointing_up;
  }

  // 6. V-Sign (Victory/Peace): index & middle extended, ring & pinky curled
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return GESTURE_DEFINITIONS.peace_sign;
  }

  return null;
}
