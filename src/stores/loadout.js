import { writable, derived } from 'svelte/store';
import { SPECIALS, UNIQUES, STACKABLES } from '../data/abilities.js';

// The raw state of the builder
export const loadout = writable({
  specials: {},   // e.g. { rupture: 3, tempo: 1 }
  uniques: [],    // e.g. ["air_dash"]
  stackables: {}  // e.g. { keen_edge: 2 }
});

// A derived store that converts the raw loadout state into an array of abilities
// (including duplicates for stackables) that can be passed directly into simulate()
export const selectedAbilities = derived(loadout, $l => {
  const list = [];
  
  // Add Specials
  for (const [id, tier] of Object.entries($l.specials)) {
    if (tier > 0) {
      const u = SPECIALS.find(x => x.id === id);
      if (u) {
        const originalApply = u.apply;
        list.push({
          ...u,
          tier,
          apply: (ctx) => {
            if (!ctx.mods.tier) ctx.mods.tier = {};
            ctx.mods.tier[id] = tier;
            if (originalApply) originalApply(ctx);
          }
        });
      }
    }
  }

  // Add Uniques
  for (const id of $l.uniques) {
    const u = UNIQUES.find(x => x.id === id);
    if (u) list.push(u);
  }

  // Add Stackables (push N times to apply N times)
  for (const [id, count] of Object.entries($l.stackables)) {
    if (count > 0) {
      const u = STACKABLES.find(x => x.id === id);
      if (u) {
        for (let i = 0; i < count; i++) {
          list.push(u);
        }
      }
    }
  }

  return list;
});
