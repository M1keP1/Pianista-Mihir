# Pianista Frontend – Visionnaires Challenge

This repo is my submission for **Visionnaires – Make Pianista Sing**.

The goal here is to build a frontend that makes it approachable: natural language in, validated PDDL and plans out, with clear visualizations to guide the process.

---

## ✨ Features Built So Far

* **Smart Mode Switching** – automatically detects and switches between AI, Domain, Domain+Problem, and Mermaid.
* **Chat Entry Point** – one input for NL, Mermaid, or PDDL → routes to editor.
* **PDDL Store** – persists chat inputs and manages transitions between Chat, Editor, and Plan pages.
* **Editor Page** – side-by-side Domain + Problem editors with validation, AI generation, the shipping **MermaidPanel** graph preview, and an in-context **PlannerDropup** selector for available planners.
* **Plan Page** – generate, view, and validate plans with the **GanttLite** timeline, raw JSON, and text tabs kept in sync.
* **Custom Components** – ModeSlider, StatusPill, theme-aware TextArea, theme switcher FAB.
* **Footer API Light** – quick status indicator for Pianista backend.

---

## 🏛 Architecture & UI Foundations

* **State & Persistence** → `shared/lib/pddlStore.ts` keeps chat, editor, and plan state consistent across pages with snapshots, job tracking, and results.
* **Theming System** →

  * `app/styles/theme.css` defines the full design token system (colors, shadows, typography, glow states, status pills, and button variants).
  * `app/providers/ThemeProvider.tsx` provides context + hooks for switching between `classic` (dark) and `light` themes, persisting choice in `localStorage`, and respecting system preference.
  * `shared/components/themeSwitcher.tsx` gives a floating FAB with accessible menu to toggle themes.
* **Backdrop Layer** → `app/BackDrop.tsx` applies theme-aware background transitions behind all app content.
* **Reusable Components** → Inputs, sliders, pills, and status indicators are modular, theme-aware, and accessibility-conscious.

---

## 🗺️ Architecture & User Flow Diagram

![Architecture & Flow](/Pianista-frontend/Pianista_Vision_V1.png)

---

## 🏗️ Tech Stack

* React 18 + TypeScript (Vite)
* CSS variables + theme system (light/classic)
* Pianista backend APIs
* React hooks + local store (`pddlStore`)
* Async polling, AbortControllers, debounced validation

---

## 🚦 Status

* Core UI implemented (Chat → Editor → Plan) with persistence and cross-page routing.
* Pianista APIs integrated (domain, problem, plan) and planner selection fetches available backends.
* MermaidPanel and GanttLite ship inside the editor and plan experiences.
* PDDL store fully functional for persistence.
* **Solver endpoints are not included** → they’re excluded for now because they are not yet functional.
* App not yet responsive across all screen sizes/browsers.
* Code works but has repetitions → refactoring planned.

---

## 🐞 Known Issues / TODOs

* Layout not fully responsive → issues on smaller screens or some browsers.
* Solver endpoints excluded until functional.
* Code repetition in places → refactor needed.

---

## 🔜 Week 2 Plan

* Integrate solver endpoints and expose solver workflows once the backend is ready.
* Make the UI fully responsive across browsers and devices.
* Improve error handling and workflow feedback.
* Reduce duplication across shared components and hooks.

---

## 📂 Structure (highlights)

```
src/
 ├─ app/
 │   ├─ App.tsx                      # Route shell + layout
 │   ├─ BackDrop.tsx                 # Theme-synced background gradient
 │   ├─ main.tsx                     # Vite entry point
 │   ├─ providers/
 │   │   └─ ThemeProvider.tsx        # Theme context + persistence
 │   └─ styles/
 │       └─ theme.css                # Design tokens and surface styles
 ├─ features/
 │   ├─ home/pages/HomePage.tsx      # Landing hub with entry shortcuts
 │   ├─ chat/pages/ChatPage.tsx      # Natural-language entry with mode detection
 │   ├─ pddl/
 │   │   ├─ pages/PddlEditPage.tsx           # Domain/problem editors + MermaidPanel + PlannerDropup
 │   │   ├─ components/MermaidPanel.tsx      # Raw ↔ graph preview tied to theme
 │   │   ├─ components/PlannerDropup.tsx     # Drop-up planner selector backed by /planners
 │   │   └─ components/EditorPanel.tsx       # Shared editor layout + validation messaging
 │   └─ planning/
 │       ├─ pages/PlanPage.tsx               # Plan viewer with timeline & validators
 │       ├─ components/GanttLite/GanttLite.tsx # Lightweight Gantt renderer for plan steps
 │       └─ hooks/usePlanData.ts             # Normalizes API payloads for the timeline
 └─ shared/
     ├─ components/
     │   ├─ Inputbox/TextArea.tsx            # Theme-aware text editor
     │   ├─ Inputbox/Controls/ModeSlider.tsx # Mode slider reused across flows
     │   ├─ Inputbox/StatusPill.tsx          # Status indicator for validation/AI states
     │   └─ themeSwitcher.tsx                # Floating theme switcher FAB
     ├─ lib/pddlStore.ts                     # Persisted store for chat/editor/plan state
     └─ hooks/useSubmitShortcut.ts           # Keyboard shortcut helper (Enter/Shift+Enter)

```
---

## ⚡ Getting Started

Clone the repo and move into the frontend folder:

```bash
git clone https://github.com/M1keP1/Pianista-Mihir.git
cd Pianista-frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the root of `Pianista-frontend`:

```bash
VITE_PIANISTA_BASE=https://planner-apim.azure-api.net
VITE_PIANISTA_KEY=your_api_key_here
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## 📜 License

© 2025 VisionSpace Technologies GmbH & Mihir Patel.
All rights reserved.

This repository is provided **exclusively** for the *Visionnaires – Make Pianista Sing* contest.

* Redistribution, commercial use, or integration into other projects is **not permitted** without written consent.
* No permission is granted for automated crawling, scraping, or use in AI training datasets.
* If this repository is public (e.g. on GitHub), it is for contest visibility only – **not for reuse**.

---

<p align="center">
  <img alt="ad astra" src="https://img.shields.io/badge/ad%20astra-build%20%7C%20iterate%20%7C%20orbit-4f46e5?style=for-the-badge">
  <br/>
  <sub>Visionnaires – Make Pianista Sing • © 2025 VisionSpace & Mihir Patel</sub>
</p>
