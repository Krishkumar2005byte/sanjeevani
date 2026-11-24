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
