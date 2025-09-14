# Pianista Frontend – Visionnaires Challenge

This repo is my submission for **Visionnaires – Make Pianista Sing**.

The goal here is to build a frontend that makes it approachable: natural language in, validated PDDL and plans out, with clear visualizations to guide the process.

---

## ✨ Features Built So Far

* **Smart Mode Switching** – automatically detects and switches between AI, Domain, Domain+Problem, and Mermaid.
* **Chat Entry Point** – one input for NL, Mermaid, or PDDL → routes to editor.
* **PDDL Store** – persists chat inputs and manages transitions between Chat, Editor, and Plan pages.
* **Editor Page** – side-by-side Domain + Problem editors with validation and AI generation.

  * Includes a **Mermaid panel** (inside the Editor) to visualize PDDL as a graph (in progress).
* **Plan Page** – generate, view, and validate plans; groundwork for a Gantt chart.
* **Custom Components** – ModeSlider, StatusPill, theme-aware TextArea, theme switcher FAB.
* **Footer API Light** – quick status indicator for Pianista backend.

---

## 🏛 Architecture & UI Foundations

* **State & Persistence** → `pddlStore.ts` keeps chat, editor, and plan state consistent across pages with snapshots, job tracking, and results.
* **Theming System** →

  * `theme.css` defines the full design token system (colors, shadows, typography, glow states, status pills, and button variants).
  * `themeContext.tsx` provides context + hooks for switching between `classic` (dark) and `light` themes, persisting choice in `localStorage`, and respecting system preference.
  * `themeSwitcher.tsx` gives a floating FAB with accessible menu to toggle themes.
* **Backdrop Layer** → `BackDrop.tsx` applies theme-aware background transitions behind all app content.
* **Reusable Components** → Inputs, sliders, pills, and status indicators are modular, theme-aware, and accessibility-conscious.

---

## 🗺️ Architecture & User Flow Diagram

![Architecture & Flow](/Pianista_Vision_v1.png)

---

## 🏗️ Tech Stack

* React 18 + TypeScript (Vite)
* CSS variables + theme system (light/classic)
* Pianista backend APIs
* React hooks + local store (`pddlStore`)
* Async polling, AbortControllers, debounced validation

---

## 🚦 Status

* Core UI implemented (Chat → Editor → Plan).
* Pianista APIs integrated (domain, problem, plan).
* Mermaid panel exists but still being refined.
* PDDL store fully functional for persistence.
* **Solver endpoints are not included** → they’re excluded for now because they are not yet functional.
* **Planner selection and the “get planners” endpoint are not yet integrated** → planned for Week 2.
* App not yet responsive across all screen sizes/browsers.
* Code works but has repetitions → refactoring planned.

---

## 🐞 Known Issues / TODOs

* Layout not fully responsive → issues on smaller screens or some browsers.
* Mermaid panel UX needs refinement (zoom/drag + syntax correction).
* Planner selection and “get planners” endpoint missing.
* Code repetition in places → refactor needed.
* Solver endpoints excluded until functional.

---

## 🔜 Week 2 Plan

* Refine the **Mermaid panel** with smoother UX and auto syntax correction.
* Add an **interactive Gantt chart** to the Plan page.
* Integrate **planner selection** and support the “get planners” endpoint.
* Improve error handling and workflow feedback.
* Make the UI **responsive** across browsers and devices.

---

## 📂 Structure (highlights)

```
src/
 ├─ api/pianista/                  # Pianista backend API wrappers
 │   ├─ convertMermaid.ts          # Convert Mermaid syntax → PDDL
 │   ├─ generateDomain.ts          # Generate domain PDDL from NL
 │   ├─ generateProblem.ts         # Generate problem PDDL from NL
 │   ├─ generatePlan.ts            # Submit domain+problem → plan job
 │   ├─ getPlan.ts                 # Retrieve plan results (polling)
 │   ├─ validatePddl.ts            # Validate single PDDL (domain/problem)
 │   ├─ validatePlan.ts            # Validate generated plan
 │   ├─ validateMatchPddl.ts       # Validate domain+problem consistency
 │   └─ health.ts                  # API health check (for footer status)
 │
 ├─ components/
 │   ├─ icons/                     # Reusable SVG icons
 │   ├─ Inputbox/                  # Input system
 │   │   ├─ Controls/
 │   │   │   ├─ ModeSlider.tsx     # Mode toggle (AI / Domain / D+P / Mermaid)
 │   │   │   ├─ SendButton.tsx     # Themed, reusable send/submit button
 │   │   │   └─ TwoModeSlider.tsx  # Variant of slider for two-mode toggles
 │   │   │
 │   │   ├─ hooks/
 │   │   │   ├─ detectProcessingMode.ts # Detects input type (domain, problem, mermaid…)
 │   │   │   ├─ useModeDetection.ts     # Hook to auto-select mode based on input
 │   │   │   └─ useSubmitShortcut.ts    # Hook for Enter-to-send / Shift+Enter new line
 │   │   │
 │   │   ├─ TextArea.tsx           # Theme-aware, auto-resize textarea
 │   │   └─ StatusPill.tsx         # Status indicator (verification, error, AI thinking…)
 │   │
 │   ├─ footer.tsx                 # App footer + API status light
 │   ├─ PillButton.tsx             # Reusable pill-shaped button
 │   ├─ themeSwitcher.tsx          # Floating FAB to toggle Classic/Light themes
 │   └─ VS_BrandButton.tsx         # Branded button component (VisionSpace style)
 │
 ├─ lib/
 │   └─ pddlStore.ts               # Local persistence: chat, domain, problem, plan jobs
 │
 ├─ pages/
 │   ├─ home.tsx                   # Landing page with entry options
 │   ├─ chat.tsx                   # Chat entry point (NL / PDDL / Mermaid)
 │   ├─ pddl-edit.tsx              # Editor: domain + problem editors + Mermaid panel
 │   └─ plan.tsx                   # Plan viewer: raw plan + future Gantt chart
 │
 ├─ theme.css                      # Global design tokens (colors, buttons, textarea glow)
 ├─ themeContext.tsx               # Theme provider + React hook (Classic/Light)
 ├─ App.tsx                        # Root app with routing and layout
 ├─ BackDrop.tsx                   # Fixed background synced to theme
 └─ index.css                      # Base stylesheet imports

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
