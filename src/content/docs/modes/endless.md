---
title: Endless Mode
description: How Tear's Endless mode works — wave scaling, HP growth, biome cycling, score strategy, and competitive play.
gameVersion: v0.1
---

Endless mode is the **competitive heart of Tear**. Waves continue indefinitely, scaling harder with each one. Your score is your legacy.

## How It Works

Endless begins at wave 1 and continues until you die. There is no campaign structure, no boss gates (unless mini-bosses crash in), and no win condition. The only goal is to last as long as possible while maintaining the highest score.

## Enemy Scaling

Unlike Adventure which scales by stages, Endless scales geometrically purely by wave count.

| Property | Formula / Detail |
|----------|---------|
| **HP per wave** | Increases by **+12%** per wave (`base_HP * 1.12^wave`) |
| **Starting enemies** | 3 on wave 1 |
| **Enemy count growth** | **+1.4** enemies per wave thereafter |
| **Concurrent Cap** | Caps at **6** simultaneous live enemies (the rest queue up) |

> [!CAUTION] The HP Wall
> At high wave counts, enemy HP massively outpaces raw damage output. Status effects (BLEED, BURN, MARK), Power Slam detonations, and burst combos become increasingly important relative to normal swing damage.

## Biome Cycling

Biomes cycle every 10 waves in Endless mode:

| Waves | Active Biome |
|-------|-------------|
| 1–10 | The Grounds |
| 11–20 | The Undercroft |
| 21–30 | The Crimson Fields |
| 31–40 | The Voidspire |
| 41–50 | The Tear |
| 51+ | Cycles back to The Grounds |

Each biome cycle brings a reset of the enemy roster to that biome's set, but with **cumulative HP scaling** — so The Grounds on cycle 2 (wave 51+) features the same enemy types as cycle 1, but with astronomically higher HP.

## Score System

Score is the primary metric of Endless performance:

```
Score per kill = 6 * wave_number * style_multiplier
```

### Style Tiers
| Points | Rank Name | Style Multiplier |
|--------|-----------|-----------------|
| 0 | (None) | 1.0x |
| 14 | **NICE** | 1.5x |
| 34 | **STYLISH** | 2.0x |
| 64 | **BRUTAL** | 3.0x |
| 110 | **SAVAGE** | 4.0x |
| 175 | **TEARING!** | 5.0x |

> [!TIP] Combo Decay
> The style meter begins draining at **26 points/sec** after **2.6 seconds** without a trick. Taking a hit instantly wipes **50%** of your current gauge!

The score grows **exponentially** with wave number. The **style multiplier** at the moment of the kill makes a TEARING! kill worth 5x the raw base score. A player staying at TEARING! tier will accumulate score far faster than someone hovering at NICE.

## Shop in Endless

Endless uses the same inter-wave shop system as Adventure. You earn coins, buy upgrades, and can reroll. 
- Upgrades compound continuously without a boss resetting the equation.
- By wave 20–30, most runs have a full T3 build online.
- Late-game strategy (wave 50+) focuses on staying alive long enough to keep applying escalating modifiers.

> [!TIP] Competitive Strategy
> **Prioritise style maintenance over kill speed.** A slightly slower kill rate at TEARING! is worth more score than a rapid kill rate at NICE. Take the time to chain launches, parries, and power slams to rack up style points (e.g. Parries grant 12 style pts, Power Slams grant 11).
>
> **Status effects over raw damage at high waves.** BLEED stacks at 6 dmg/s (max 8 stacks) and BURN at 20 dmg/s. While flat numbers, their stacking and synergy with multipliers extend viability into the 50s+ waves.
