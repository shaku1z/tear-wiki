# TEAR Wiki — Project Vision & Handoff

Welcome to the **TEAR Wiki**. This document outlines the core vision, architectural decisions, and aesthetic constraints for the project. It serves as a true north for future development, ensuring that the identity of both the wiki and its interactive components remains consistent.

## 1. The Core Vision
The TEAR Wiki is not a standard, generic documentation site. It is designed to feel like an in-universe terminal or mechanical database. 

**Key Directives:**
- **STRICTLY FORBIDDEN:** You are strictly forbidden from altering the actual game's codebase. Your modifications must be 100% contained within this `tear-wiki` project folder. Do not attempt to fix or alter game engine logic upstream.
- **Zero Hardcoding:** The wiki must never contain hardcoded game values (like base health, damage scalars, or upgrade properties). Modern reference views consume the validated, committed game-reference artifact; the retained JS-era snapshot is comparison material only.
- **Deep Immersion:** The design language is strictly *Brutalist, High-Contrast, and Mechanical*. Avoid soft rounded corners, pastel gradients, or corporate aesthetics ("AI slop"). Use monospace typography for data and aggressive borders (e.g., `inset 0 0 0 1px`).

## 2. Architecture Stack
- **Framework:** Astro + Starlight.
- **Content:** MDX (Markdown + JSX). Content files (`src/content/docs/`) import Astro components to render dynamic data instead of static tables.
- **Interactivity:** Svelte. All highly interactive, stateful components (like the Loadout Builder) are built in Svelte for rapid reactivity and clean state management.

## 3. The Builder Engine (`/src/components/builder/`)
The **Loadout Builder** is the mechanical heart of the wiki. It lets players arrange the published upgrade catalog and share a bounded, versioned loadout without claiming to reproduce runtime combat.

- **Data Sourcing (`src/data/game-reference.mjs`):** Astro reads and validates the committed artifact, then passes a narrow JSON-safe upgrade projection to the client Builder.
- **Planner State (`src/stores/loadout.js`):** The client stores only tier, unique, and stack selections. It does not execute game callbacks or mutate runtime configuration.
- **Reference Rail (`PlannerSummary.svelte` / `TierDeltaPanel.svelte`):** The side rail reports catalog counts and the published tier descriptions; damage, runtime stats, and inferred synergies are intentionally outside this view.
- **Deep Linking (`BuilderDeepLink.astro` / `src/lib/urlEncoder.js`):** Builder links use a validated, URL-safe v2 payload with a strict catalog allow-list and size/entry bounds.

## 4. Aesthetic & Styling Rules
Future developers (Codex or otherwise) must adhere to these strict visual rules:
1. **Color Palette:** Strictly adhere to the Starlight color tokens (`var(--sl-color-gray-6)`, `var(--sl-color-white)`, `var(--sl-color-accent)`).
2. **Typography:** Data, stats, and telemetry readouts must use `monospace` fonts.
3. **UI Elements:** Use mechanical styles. Buttons should behave like tactile switches. Badges should be sharp and highly legible. 
4. **Layout:** Eradicate unnecessary vertical scrolling. Use compact CSS Grids (`grid-template-columns: repeat(auto-fit, minmax(X, 1fr))`) to condense information efficiently.

## 5. Ongoing Work & Next Steps
- **Data Synchronization:** `scripts/sync-config.js` is the retained JS-era snapshot pipeline, not a current freshness guarantee. Production synchronization is disabled pending the typed G6 contract. If a future verified source adds engine files, update the `FILES` array in that separately authorized migration.
- **Component Expansion:** Continue migrating static markdown pages to use dynamic Astro components (`BossProfile.astro`, `EnemyStats.astro`, `StageEnvironment.astro`).

*End of Document.*
