# 🏋️ Smart Workout Planner & Tracker

## 📋 Project Information
- **Student**: Adam Fikri bin Mohd Lotfi
- **Student ID**: 1211111950
- **Institution**: MMU Faculty of Computing & Informatics
- **Specialization**: Software Engineering
- **Project Type**: Application-Based (Product Development)
- **Timeline**: Two Trimesters (FYP1 + FYP2)

## 🎯 Project Overview
A mobile fitness application that generates personalized workout plans using an **Integer Linear Programming (ILP)-based algorithm**, tailored to each user's fitness goal, experience level, available equipment, and weekly schedule. Built to address the high dropout rates (45–80% within 4 years) driven by generic, non-personalized fitness guidance — validated through a survey of 124 target users during the requirements phase.

**Note:** The frontend was migrated from the originally proposed Flutter to **React Native** during development, due to a hardware constraint (Flutter's Android emulator requiring ~16GB RAM, exceeding the development machine's capacity). The Firebase backend and overall architecture were retained.

## 🚀 Key Features

**Core**
- ✅ User registration & authentication (Firebase Auth)
- ✅ Onboarding with goal, equipment, level & schedule input
- ✅ ILP-based personalized workout plan generation
- ✅ BMR/TDEE calculation (Mifflin-St Jeor formula)
- ✅ Guided workout execution with rest timers & embedded video tutorials
- ✅ Post-workout difficulty rating
- ✅ XP, streaks, and gamification
- ✅ Admin dashboard (active/inactive user tracking)

**Shipped in refinement phase** (closing gaps found via requirements traceability review)
- ✅ Plan history with reroll to any past version
- ✅ Body weight tracking with automatic BMR/TDEE recalculation
- ✅ Workout calendar (visual completion tracking)
- ✅ Achievement badges
- ✅ Day-swap (rearrange which day gets which workout focus)

## 🧪 Testing & Validation
- Unit testing: 7/7 test cases passed (ILP algorithm, BMR/TDEE calculations)
- Integration testing: 5/5 cross-screen data flows verified
- Usability testing: 10 users, **System Usability Scale (SUS) = 77.5** ("Good")
- Requirements coverage: **12/14 functional requirements**, **10/10 user requirements** fully implemented and verified

## 📱 Deployment
- iOS Simulator (primary development/testing target)
- Real device installation verified on iPhone & iPad (free Apple ID provisioning)
- Android build path documented; full verification identified as future work

## 🛠️ Tech Stack
- **Frontend**: React Native (TypeScript)
- **Backend**: Firebase Authentication + Cloud Firestore
- **Algorithm**: Custom ILP-based plan generation engine
- **Exercise Dataset**: 2,677 exercises (bundled locally, no external API)

## 📊 Current Status
**Phase**: FYP2 complete — core app, refinement features, and testing all delivered
**Progress**: 100% (implementation & testing phase)
**Last Updated**: September 24, 2026

---

## 🔧 Getting Started (Forking / Running This Project Yourself)

This project connects to **your own private Firebase project**, not a shared one — no credentials are committed to this repo (correctly excluded via `.gitignore`), so you'll set up your own backend in about 10 minutes following the steps below. Your data will be completely separate from the original developer's.

### Prerequisites
- **Node.js** ≥ 22.11.0
- **Xcode** (for iOS — Mac only) with Command Line Tools installed
- **CocoaPods** (`sudo gem install cocoapods`, if not already installed)
- **Android Studio + SDK** (only if you want to build for Android — see Android section below)
- A **free Firebase account** ([firebase.google.com](https://firebase.google.com))
- A **free Apple ID** (only needed if you want to install on a real iPhone/iPad — the iOS Simulator works with no Apple account at all)

### Step 1 — Clone the repo
```bash
git clone https://github.com/versyy35/fitness-tracker-FYP.git
cd fitness-tracker-FYP/FitnessApp
```

### Step 2 — Install dependencies
```bash
npm install
cd ios && pod install && cd ..
```

### Step 3 — Create your own Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it anything you like → follow the prompts (Google Analytics is optional, can be disabled)
2. Once created, click **Build → Authentication** → **Get Started** → enable the **Email/Password** sign-in provider
3. Click **Build → Firestore Database** → **Create database** → start in **test mode** for local development (or set up proper security rules — see the note on this in the project's report if you want it production-ready)
4. Go to **Project Settings** (gear icon, top-left) → scroll to **"Your apps"** → click the **Web icon (`</>`)** to register a new app
   > ⚠️ Register as a **Web app**, not iOS or Android — this project uses Firebase's JavaScript SDK, which works identically across platforms and only needs the Web config.
5. Give it any nickname, skip Firebase Hosting setup, click **Register app**
6. Firebase will show you a config object like this — **keep this page open**, you'll need these values in the next step:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

### Step 4 — Create your `.env` file
In the `FitnessApp` folder (same level as `package.json`), create a new file named exactly `.env` and fill it in using the values from Step 3:

```
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
```

No quotes around values, no spaces around the `=` sign. This file is already listed in `.gitignore`, so it will never be accidentally committed.

### Step 5 — Run on iOS Simulator
```bash
npx react-native run-ios
```
First build takes a few minutes. No Apple account needed for the simulator.

### Step 6 — (Optional) Run on your own physical iPhone/iPad
1. Plug your device into your Mac, unlock it, tap **Trust This Computer**
2. Open the project in Xcode: `open ios/FitnessApp.xcworkspace`
3. In Xcode: select your device from the device dropdown at the top
4. Click the **FitnessApp** project in the sidebar → **Signing & Capabilities** tab → under **Team**, select your own Apple ID (adds it automatically if not already there via Xcode → Settings → Accounts)
5. **Important:** change the **Bundle Identifier** (in the **General** tab) to something unique to you — e.g. `com.yourname.smartworkoutplanner` — since bundle IDs must be globally unique, and reusing the one already in this repo may fail to register under your own account
6. Click ▶️ to build and install
7. First launch will likely show an "Untrusted Developer" block — on the device: **Settings → General → VPN & Device Management** → trust your Apple ID → relaunch the app

> **Note:** with a free (non-paid) Apple ID, apps installed this way stop working after 7 days and need reinstalling via Xcode. This is an Apple platform limitation, not specific to this project.

### Step 7 — (Optional) Run on Android
```bash
npx react-native run-android
```
Requires Android Studio + the Android SDK to be installed and `ANDROID_HOME` set in your shell profile. See [React Native's official environment setup guide](https://reactnative.dev/docs/set-up-your-environment) if you haven't configured this before. No `google-services.json` is required — this project uses Firebase's JS SDK, which works identically across platforms using only the `.env` values from Step 4.

---

## ⚠️ Known Limitations
- Native push notifications are not implemented (in-app notification banners only)
- Android has not been independently verified/tested (architecturally supported via React Native, but unconfirmed)
- Firestore security rules currently use a blanket authenticated-access check rather than per-document ownership rules — not production-hardened as-is