# 🌿 Sanjeevani (संजीवनी)
<!-- Overview + how to run (Member 6) -->

> **Giving a voice to patients who cannot speak.**

Sanjeevani is an accessible, high-contrast healthcare web application built for hackathons. It bridges the critical communication gap for non-verbal, stroke, ICU, or paralyzed patients who need to communicate symptoms to caregivers and doctors quickly and safely.

---

## 🚀 The Core Flow

1. **Patient taps a symptom** (e.g. *Chest Pain* / *सीने में दर्द*).
2. **Device speaks aloud** in Hindi or English using the browser's Web Speech API.
3. **Symptom is saved** to a single shared patient record.
4. **AI evaluates urgency** via Gemini API (with an automatic offline rule fallback) and assigns a cautious urgency rating (`Low` / `Medium` / `High`).
5. **Caregiver dashboard updates LIVE** with symptoms, AI urgency assessment, and medication schedule.
6. **Caregiver books a language-matched doctor** with instant mock video teleconsultation links.
7. **Dangerous drug interaction detection**: Adding clashing medications (e.g. *Aspirin + Warfarin*) immediately flags a bold red safety warning explaining why they clash.

---

## 🛠 Tech Stack

- **Frontend:** React + Vite (Plain JavaScript, no TypeScript)
- **Routing:** `react-router-dom`
- **Database:** Firebase Firestore (with automatic zero-config `localStorage` fallback)
- **Styling:** Plain CSS (`src/styles.css`, large min-64px buttons, high contrast, responsive)
- **Speech:** Browser Web Speech API (`window.speechSynthesis`)
- **AI Triage:** Google Gemini API (`gemini-1.5-flash`) via `lib/triage.js`

---

## 📂 Project Structure & Developer Ownership

```text
sanjeevani/
├── src/
│   ├── pages/
│   │   ├── Home.jsx             Role picker (Dev 3)
│   │   ├── Patient.jsx          Symptom buttons + speech (Dev 1)
│   │   ├── Caregiver.jsx        Live dashboard (Dev 3)
│   │   ├── Doctors.jsx          Doctor list, filters, connect (Dev 2)
│   │   └── Medicines.jsx        Tracker + drug warnings (Dev 3)
│   │
│   ├── components/
│   │   ├── Navbar.jsx           (Dev 3)
│   │   ├── SymptomButton.jsx    (Dev 1)
│   │   ├── WebcamGesture.jsx    Webcam box + gesture detection (Dev 1)
│   │   ├── UrgencyBadge.jsx     (Dev 2)
│   │   ├── WarningBox.jsx       (Dev 2)
│   │   ├── DoctorCard.jsx       (Dev 2)
│   │   └── MedicineCard.jsx     (Dev 3)
│   │
│   ├── lib/
│   │   ├── firebase.js          Database connection (Dev 3)
│   │   ├── patientService.js    ALL database reads/writes (Dev 3)
│   │   ├── triage.js            AI call + fallback (Dev 2)
│   │   ├── interactions.js      Dangerous drug pairs (Dev 3)
│   │   ├── speech.js            Text-to-speech helper (Dev 1)
│   │   └── gestures.js          MediaPipe hand logic (Dev 1)
│   │
│   ├── data/
│   │   ├── symptoms.json        (Dev 1)
│   │   ├── doctors.json         (Dev 2)
│   │   └── medicines.json       (Dev 3)
│   │
│   ├── App.jsx                  Page routes
│   ├── main.jsx
│   └── styles.css               Shared colors and fonts (Member 4 decides)
│
├── .env                         API keys (NEVER push to GitHub)
├── .env.example                 Empty template of the keys
├── .gitignore                   Must list .env and node_modules
└── README.md                    Overview + how to run (Member 6)
```

---

## ⚡ How to Run the App

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

> [!TIP]
> **Zero Configuration Works Out of the Box!**
> You do **not** need to set up Firebase or Gemini immediately. If `.env` is omitted or contains placeholders, Sanjeevani automatically uses `localStorage` with real-time browser events and a robust offline triage engine. The app works on first run!

---

## 🔑 Adding Real Cloud Keys (`.env`)

To use real cloud services:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Firebase and Gemini credentials:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-app
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   VITE_GEMINI_API_KEY=AIzaSy...
   ```
3. Restart the dev server (`npm run dev`).

---

## 📋 Shared Patient Record (`demo-patient`)

All components read and write to a single document (`patients/demo-patient`) managed exclusively via `lib/patientService.js`:

```javascript
{
  name: "Ramesh",
  age: 62,
  language: "Hindi",
  symptoms: ["Chest Pain"], // array of strings, written by Patient page
  urgency: "High",          // "Low" | "Medium" | "High", written by triage.js
  aiSummary: "Potential cardiac symptom. Seek emergency medical attention immediately.",
  emergency: false,         // true when Emergency Help is tapped
  medicines: [
    { name: "Metformin", time: "Morning", taken: true },
    { name: "Amlodipine", time: "Night", taken: false }
  ],
  warnings: [],             // array of danger strings from interactions.js
  appointment: null,        // { doctorId, doctorName, time, videoLink }
  updatedAt: "2026-11-24T08:00:00.000Z"
}
```

---

## 🌿 Git Team Workflow

Each developer works on their dedicated feature branch:

| Developer | Branch | Responsibility |
|---|---|---|
| **Dev 1** | `dev1-buttons` | Voiceboard UI, symptom cards, Hindi/English speech, emergency button (`Patient.jsx`, `speech.js`, `SymptomButton.jsx`) |
| **Dev 2** | `dev2-ai-doctors` | Gemini AI triage prompt, fallback rules, doctor matchmaking (`Doctors.jsx`, `triage.js`, `DoctorCard.jsx`, `UrgencyBadge.jsx`) |
| **Dev 3** | `dev3-dashboard` | Live caregiver feed, medicine tracking, dangerous drug interaction warnings (`Caregiver.jsx`, `Medicines.jsx`, `interactions.js`, `MedicineCard.jsx`) |

### Example Branch Commands:
```bash
# Start your feature branch
git checkout -b dev1-buttons

# Make changes, commit, and push
git add .
git commit -m "feat: improve voice synthesis rate for Hindi"
git push origin dev1-buttons
```


---

## Eye-Gesture Accessibility Mode (Patient Panel Only · Hands-Free Navigation)

Sanjeevani includes an optional **Eye Control Mode** scoped specifically to the **Patient Panel (`/patient`)** for paralyzed and motor-impaired users. Powered lazily by `@mediapipe/tasks-vision` (`FaceLandmarker` with iris landmarks and blendshapes), it runs **100% on-device** in the browser and is **OFF by default**.

### Setup & Consent
1. Navigate to the **Patient Panel (`/patient`)** and click **Eye Control** in the patient action strip.
2. Review and accept the **On-Device Camera Consent** dialog (no video frames are ever stored or uploaded).
3. The local MediaPipe Face Landmarker model (`public/mediapipe/face_landmarker.task` + WASM) loads lazily on demand. Leaving the Patient Panel immediately stops the camera stream.

### 9-Point Calibration
- When first enabled (or anytime via **Recalibrate** in the top Eye Bar / Settings), look naturally at each of the **9 screen target dots** (`Top Left` to `Bottom Right`) once the AI Face Landmarker is ready.
- Calibration fits a 5-parameter affine ridge regression model combining rigid-canthus normalized iris offsets and head pose (yaw/pitch), verifies fit error quality, and persists in `localStorage`.

### Supported Eye Gestures & Selection Modes
- **Double-Blink Click (Default):** Look at any control (cursor freezes briefly during blinks and snaps magnetically within `~80px`), then **blink twice cleanly** within `900ms` to click it. Natural single blinks are ignored, preventing accidental selections.
- **Dwell Click (Optional):** Can be enabled in Settings to click after holding gaze continuously (`0.6s–3.0s`).
- **Scanning Mode (Fallback):** Cycles through focusable targets one by one at an adjustable interval (`1.0s–3.5s`).
- **Pause / Resume (2s Eyes Closed):** Shut both eyes continuously for **2 seconds** to pause tracking (and again for 2s to resume). No clicks fire while paused.
- **Scrolling, Keyboard, SOS & Agent:** Includes edge auto-scroll, Scroll Up/Down buttons, automatic Dwell/Double-Blink Keyboard + spoken quick phrases, **Talk to Agent**, and a fixed **SOS** Emergency trigger.

### Known Limitations
- **Ambient Lighting:** Dim or strongly backlit rooms degrade iris tracking (`Too dark` warning appears; turn on soft front lighting).
- **Eyewear & Glare:** Heavy dark-rimmed glasses or strong screen reflections over pupils can partially occlude iris landmarks and reduce gaze precision; **Scanning Mode** is built as a reliable fallback.
- **Webcam Resolution & FOV:** Consumer 720p webcams work best at an arm's length distance (`45–70cm`) centered at eye height (`Move closer` banner alerts if distance is too far).


---

## Part E: Modes, Role Route Guards, Unified Input (Eye + Hand Gestures) & Emergency Contacts

### 1. Care Modes & Protected Role Dashboards
- **Entry Screen (`/`)**: Choose between **Home Mode** (`/home/patient`, `/home/caretaker`) and **Hospital Mode** (`/hospital/patient`, `/hospital/doctor`, `/hospital/nurse`) with persistent `ModeProvider` + `Switch Mode / Role` header control.
- **Route Guards (`RoleRouteGuard`) & Staff Auth**: Users cannot jump directly into another role's private dashboard URL. **Hospital Doctor** and **Hospital Nurse** include a mock Staff ID + PIN verification dialog before entering.
- **Permissions (`src/lib/permissions.ts`)**: Emergency contacts are editable strictly by **Home Caretaker** or **Hospital Nurse**, and read-only for Patients.

### 2. Unified Biometric Input (`Eye + Hand Gestures` on 1 Shared Camera)
Available on both Patient views (`/home/patient` and `/hospital/patient`) as well as `/patient`:
- **Eye Control:** 9-point calibration + Double-Blink to select + 2s closed-eyes pause.
- **Hand Gesture Control (lazy MediaPipe `HandLandmarker`, shares Eye Control webcam stream):**
  - **Index Finger Pointing:** Moves cursor smoothly with One Euro tremor filter & 80px magnetic snapping.
  - **Pinch (Thumb + Index):** Click/Select with debounce.
  - **Open Palm (held 1s):** Pause / Resume tracking.
  - **Thumbs Up:** Sends `"I'm okay"` check-in to Caretaker or Nurse dashboard.
  - **Closed Fist (held 2s):** Triggers Emergency SOS countdown flow.

### 3. Emergency Numbers & Backend Boundaries
- **Regional Verification Note:** Default numbers (`108`, `102`, `112`) are Indian emergency helplines. Verify local emergency numbers for your region before deployment.
- **Mocked Components vs Real Backend Replacement:**
  - `src/lib/data/sanjeevaniStore.ts` (`localStorage` + `CustomEvent` pub-sub) mocks multi-user real-time alerts, nurse task queues, and emergency contacts. Replace its adapters with Firebase Realtime/Firestore listeners, Supabase Realtime, or REST/WebSockets.
  - `src/components/modes/ModeProvider.tsx` uses mock role/PIN auth (`MockAuthSession`) ready for Firebase Auth, Supabase Auth, or NextAuth/OAuth replacement.
