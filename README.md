# SahkaarSetu Kiosk

SahkaarSetu Cooperative Assistance Kiosk — a separate, touchscreen-first web application for physical kiosks serving farmers, cooperative members, and rural citizens.

## Overview

- **Purpose:** ATM-inspired public-service kiosk frontend
- **Target Hardware:** Raspberry Pi 5 · 7–10.1" Touchscreen · Landscape
- **Tech Stack:** React 18 · Vite 5 · TypeScript
- **Languages:** 22 languages currently supported by the SahkaarSetu Citizen UI
- **Backend:** Connects to the same existing SahkaarSetu FastAPI backend

## Repository Boundaries

This is a **separate, isolated** frontend repository. It does **NOT** contain or share code from:
- `SIH26088-Cooperative-AI` (Citizen app)
- `Sarkar Setu Admin` (Admin app)
- Any backend code

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

## Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `VITE_API_BASE_URL` — URL of the existing SahkaarSetu FastAPI backend

## Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 5174 |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run all tests once |

## Screen Flow

```
Splash → Language Selection → Kiosk Home → (Voice / Type / Scan)
                ↑                                     │
                └─────── Inactivity Reset ────────────┘
```

## Design Principles

- **Voice-first** — primary interaction is voice
- **Touch-first** — all targets ≥ 48px, no hover-only interactions
- **Ephemeral sessions** — no citizen data persisted across sessions
- **Inactivity reset** — 2 minutes of inactivity returns to language selection
- **Privacy** — zero citizen PII in localStorage/sessionStorage/browser cache

## Hardware Targets

| Device | Resolution |
|---|---|
| 7" Touchscreen | 1024×600 |
| 8–10" Touchscreen | 1280×800 |
| HD Display | 1920×1080 |
| Portrait Test | 768×1024 |

## Security

The frontend contains **only** the public API base URL. No API keys (Gemini, BHASHINI, Supabase service keys) are stored in the frontend.

## Project Structure

```
src/
├── assets/         Logo and static assets
├── components/
│   ├── common/     Reusable UI primitives
│   └── kiosk/      Kiosk-specific UI blocks
├── context/        Kiosk session context (ephemeral, in-memory)
├── hooks/          Custom hooks (inactivity timer etc.)
├── i18n/           22-language translation system
├── pages/          Screen-level components (Splash, Language, Home)
├── services/       API client + hardware placeholder interfaces
├── tests/          Vitest test suite
├── types/          TypeScript types
└── utils/          Utility functions
```

## K1/K2 Milestone Status

- ✅ Project scaffold (Vite + React + TypeScript)
- ✅ SahkaarSetu branding
- ✅ Splash screen
- ✅ 22-language support (Citizen UI language list)
- ✅ Touch-friendly language selection
- ✅ Kiosk home screen
- ✅ Ephemeral session state
- ✅ 2-minute inactivity timeout
- ✅ Timeout warning modal
- ✅ Active-operation protection
- ✅ Privacy — no localStorage PII
- ✅ API foundation (VITE_API_BASE_URL)
- ✅ Hardware placeholder interfaces
- ✅ Accessibility
- ✅ Responsive layouts (4 viewports)
- ✅ Automated tests (Vitest)
- ✅ Production build (0 errors)
