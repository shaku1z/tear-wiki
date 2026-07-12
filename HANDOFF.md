# TEAR Wiki — Project Vision & Handoff

Welcome to the **TEAR Wiki**. This document outlines the core vision, architectural decisions, and aesthetic constraints for the project. It serves as a true north for future development, ensuring that the identity of both the wiki and its interactive components remains consistent.

## 1. The Core Vision
The TEAR Wiki is not a standard, generic documentation site. It is designed to feel like an in-universe terminal or mechanical database. 

**Key Directives:**
- **STRICTLY FORBIDDEN:** You are strictly forbidden from altering the actual game's codebase. Your modifications must be 100% contained within this `tear-wiki` project folder. Do not attempt to fix or alter game engine logic upstream.
- **Zero Hardcoding:** The wiki must never contain hardcoded game values (like base health, damage scalars, or upgrade properties). All data is dynamically extracted from `src/scripts/game-engine.js` so that the wiki is perpetually synchronized with the live game repository.
- **Deep Immersion:** The design language is strictly *Brutalist, High-Contrast, and Mechanical*. Avoid soft rounded corners, pastel gradients, or corporate aesthetics ("AI slop"). Use monospace typography for data and aggressive borders (e.g., `inset 0 0 0 1px`).

## 2. Architecture Stack
- **Framework:** Astro + Starlight.
- **Content:** MDX (Markdown + JSX). Content files (`src/content/docs/`) import Astro components to render dynamic data instead of static tables.
- **Interactivity:** Svelte. All highly interactive, stateful components (like the Loadout Builder) are built in Svelte for rapid reactivity and clean state management.

## 3. The Builder Engine (`/src/components/builder/`)
The **Loadout Builder** is the mechanical heart of the wiki. It allows players to theorycraft builds by directly simulating the game engine's logic.

- **Data Sourcing (`src/data/abilities.js`):** Abilities are categorized directly from the `UPGRADES` array exported by `game-engine.js`. Specials are filtered via the `u.tiers` property.
- **Simulation Pipeline (`src/lib/simulate.js`):** The engine clones the game's `BASE_CONFIG` and iterates through the player's selected loadout, executing the exact same `apply({ config, player, mods })` functions the game uses.
- **Telemetry Dashboard (`StatPanel.svelte`):** This panel reads the output of the simulation and translates it into true mechanical metrics. It tracks deep engine variables like `parrySlowScale`, `deflectDmgMult`, dynamic throw damage, and style meter decay.
- **Deep Linking (`BuilderDeepLink.astro`):** The Builder supports Base64 URL encoding so players can seamlessly share their loadouts across the internet.

## 4. Aesthetic & Styling Rules
Future developers (Codex or otherwise) must adhere to these strict visual rules:
1. **Color Palette:** Strictly adhere to the Starlight color tokens (`var(--sl-color-gray-6)`, `var(--sl-color-white)`, `var(--sl-color-accent)`).
2. **Typography:** Data, stats, and telemetry readouts must use `monospace` fonts.
3. **UI Elements:** Use mechanical styles. Buttons should behave like tactile switches. Badges should be sharp and highly legible. 
4. **Layout:** Eradicate unnecessary vertical scrolling. Use compact CSS Grids (`grid-template-columns: repeat(auto-fit, minmax(X, 1fr))`) to condense information efficiently.

## 5. Ongoing Work & Next Steps
- **Data Synchronization:** `scripts/sync-config.js` is the pipeline that pulls data from the live game repository. If new engine files are added to the main game, they must be appended to the `FILES` array in this script.
- **Component Expansion:** Continue migrating static markdown pages to use dynamic Astro components (`BossProfile.astro`, `EnemyStats.astro`, `StageEnvironment.astro`).

*End of Document.*
