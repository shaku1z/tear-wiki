# G4 wiki terminology receipt

Status: terminology-only, governance-only, not deployed

Base: protected `main` at `37b9a7d92c6566f1ff9b8424c5b12b609c0114e4`<br>
Branch: `codex/g4-wiki-permanent-terminology`<br>
Retained game snapshot: `shaku1z/tear@d62c20eca2da067800f763abc5afdf4c7747fe76`<br>
Snapshot capture: `2026-07-18T05:40:18Z`<br>
Future synchronization owner: G6 typed game-reference contract

## Scope

- Added the authored `g4-wiki-terminology-v1` registry and `final-five-v1` roster contract.
- Established permanent public names: TEAR Music, Adaptive Soundtrack, Music, Soundtrack Desk, Training Operations, Scenario Console, Replay Editor, Replay Hub, Game Agent, Training Archive, Run Monitor, and unchanged TearBench.
- Established the ordered Final Five: sword, hammer, greatsword, chainblade, riftlock.
- Kept `spear → greatsword` and `ringblade → riftlock` only as explicit migration references; they are not current selectable weapons.
- Added canonical public reference pages and a terminology role to the Astro content schema.
- Replaced misleading live-sync claims with retained-snapshot language and exposed the exact source SHA/capture date.

## Deliberate non-scope

The generated engine, manifest, source pointer, and legacy synchronization workflow were not regenerated, rewritten, enabled, or dispatched. No typed G6 game-reference synchronization was attempted, and no deployment was performed.

## Evidence

- `npm run verify:terminology`
- `npm run check:snapshot`
- `git diff --check`

The validation script checks the registry schema, canonical term order, Final Five migration map, retained snapshot identity, and absence of deprecated aliases from active wiki source. Compatibility and historical identifiers remain represented by the registry policy and explicit reference page rather than current public labels.
