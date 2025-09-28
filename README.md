# Pianista Frontend – Visionnaires Challenge

This repo is my submission for **Visionnaires – Make Pianista Sing**.

The goal here is to build a frontend that makes it approachable: natural language in, validated PDDL and plans out, with clear visualizations to guide the process.

---
# Demo Video (To be uploaded)
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

## 🐞 Known Issues / TODOs

* Previous Chats not accesible through UI
* key visible - need to offload endpoints to a backend (not provided by VS)

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
  <sub>Visionnaires – Make Pianista Sing • © 2025 VisionSpace & Mihir Patel</sub>
</p>
