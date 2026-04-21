# Nexara

> **Nex** — from Latin *nexus* (connection, bond) + **ara** — Latin for *altar* or *bright star* in the southern constellation Ara.
>
> **Nexara** means *"a luminous connection"* — the bridge between where you are and the best version of yourself. It represents the bond between mind, body, and momentum.

---

## What is Nexara?

Nexara is a **premium dark-themed fitness & health tracking app** built with React Native and Expo. It helps users track workouts, monitor nutrition, log sleep, and visualise health metrics — all wrapped in a sleek **Dark Glassmorphism UI** with fluid animations and gradient accents.

The app is designed for people who take their health seriously and want a tool that feels as premium as their goals.

---

## Screenshots

| Onboarding | Auth | Dashboard |
|------------|------|-----------|
| Dark welcome + 3 feature slides | Phone + OTP, Google & Facebook | Ring progress, glow stat cards |

| Workout | Meal Planner | Sleep |
|---------|--------------|-------|
| Weekly chart, toggles, categories | Macro bars, meal filters, food grid | Bezier wave chart, schedule toggles |

---

## Features

- **Phone OTP Authentication** — no passwords; Firebase-backed phone verification with country picker
- **Social Login** — Google and Facebook (colourful brand logos)
- **Onboarding Flow** — 3 animated feature slides + profile setup (name, age, weight, height, goal)
- **Dashboard (Home)** — step ring progress, today's target card, 4 glow activity stat cards with sparklines, weekly bar chart, latest workouts
- **Workout Tracker** — upcoming workouts with on/off toggles, weekly activity chart, training category cards
- **Meal Planner** — daily macro progress bars (calories, protein, carbs, fat), meal schedule, filter chips, food category grid
- **Sleep Tracker** — SVG bezier sleep wave chart, last-night ring score, bedtime/alarm toggles, add alarm
- **Profile** — avatar with initials, stats row (height/weight/age), settings sections, logout
- **Custom SVG Icon Library** — 20+ crisp Lucide-style icons, zero external icon font dependency
- **Reusable Components** — `GlassCard`, `RingProgress` (animated SVG ring with gradient)
- **Dark Glassmorphism Design** — semi-transparent cards, purple/cyan gradient accents, glow shadows throughout

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript 5.9 |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| Auth | Firebase (phone OTP) |
| Gradients | expo-linear-gradient |
| Vector Graphics | react-native-svg |
| HTTP Client | Axios |
| Storage | @react-native-async-storage/async-storage |
| State | React Context (AuthContext) |

---

## Project Structure

```
nexara/
├── app.json                    # Expo config
├── App.tsx                     # Entry point
├── index.ts                    # Expo registration
├── assets/                     # Icons, splash, images
└── src/
    ├── api/                    # Axios API layer
    │   ├── metrics.ts
    │   └── profile.ts
    ├── components/
    │   ├── CountryPicker/      # Phone country code picker
    │   ├── GlassCard/          # Reusable glassmorphism card
    │   ├── icons/              # Custom SVG icon library (20+ icons)
    │   └── RingProgress/       # Animated SVG ring progress chart
    ├── context/
    │   └── AuthContext.tsx     # Auth state + Firebase OTP logic
    ├── navigation/
    │   ├── AppNavigator.tsx    # Root navigator + custom glass tab bar
    │   ├── navigationRef.ts    # Navigation ref for use outside components
    │   └── types.ts            # Route param types
    ├── screens/
    │   ├── Auth/               # Phone input + OTP verification
    │   ├── Dashboard/          # Home screen with all metrics
    │   ├── MealPlanner/        # Nutrition tracking
    │   ├── Onboarding/         # Welcome slides + profile setup
    │   ├── Profile/            # User profile & settings
    │   ├── Sleep/              # Sleep tracking
    │   └── Workout/            # Workout tracking
    ├── types/                  # Shared TypeScript types
    └── utils/
        ├── countryCodes.ts     # Phone country code data
        ├── figmaAssets.ts      # Figma MCP asset URLs
        └── theme.ts            # Dark premium design tokens
```

---

## Design System

### Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| `COLORS.bg` | `#0A0E27` | App background |
| `COLORS.bgCard` | `rgba(255,255,255,0.07)` | Glass card fill |
| `COLORS.border` | `rgba(255,255,255,0.12)` | Card borders |
| `COLORS.primary` | `#7C3AED` | Purple accent / CTA |
| `COLORS.cyan` | `#06B6D4` | Cyan accent / gradients |
| `COLORS.text` | `#FFFFFF` | Primary text |
| `COLORS.textSub` | `rgba(255,255,255,0.6)` | Secondary text |
| `COLORS.textMuted` | `rgba(255,255,255,0.35)` | Muted / labels |

### Gradients

- **Primary CTA:** `#7C3AED → #06B6D4` (purple to cyan)
- **Workout:** `#7C3AED → #A78BFA`
- **Nutrition:** `#10B981 → #34D399`
- **Sleep:** `#7C3AED → #4F46E5`
- **Heart Rate:** `#EC4899 → #F43F5E`
- **Calories:** `#F59E0B → #EF4444`

### Border Radius

| Token | Value |
|-------|-------|
| `RADIUS.sm` | 12 |
| `RADIUS.md` | 18 |
| `RADIUS.lg` | 24 |
| `RADIUS.xl` | 32 |
| `RADIUS.full` | 999 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator or Expo Go app

### Installation

```bash
git clone https://github.com/your-username/nexara.git
cd nexara
npm install
```

### Environment Setup

Create a `.env` file (or update `app.json`) with your Firebase config:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_APP_ID=your_app_id
```

### Run

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

---

## Authentication Flow

```
App Launch
    │
    ├─ Not authenticated ──► Auth Screen
    │                            │
    │                     Enter phone number
    │                            │
    │                      Send OTP (Firebase)
    │                            │
    │                     Enter 6-digit code
    │                            │
    │                      Verify OTP
    │                            │
    ├─ Authenticated, no onboarding ──► Onboarding
    │                                       │
    │                              3 feature slides
    │                                       │
    │                              Profile setup
    │                                       │
    └─ Authenticated + onboarded ──► Main App (5 tabs)
```

---

## Roadmap

- [ ] Load Poppins font via `expo-font` for full design fidelity
- [ ] Push notifications for workout reminders and sleep alerts
- [ ] Apple Health / Google Fit integration
- [ ] Wearable device sync (Apple Watch, Fitbit)
- [ ] AI-powered workout recommendations
- [ ] Social features — challenges, leaderboards, friend activity
- [ ] Offline mode with local data sync
- [ ] Dark / Light theme toggle

---

## License

MIT © Nexara
