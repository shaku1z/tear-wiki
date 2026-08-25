import { writable } from 'svelte/store';

// The planner stores selections only. It deliberately has no derived game
// objects, callbacks, or runtime configuration to pass into a simulator.
export function createEmptyLoadout() {
  return { specials: {}, uniques: [], stackables: {} };
}

export const loadout = writable(createEmptyLoadout());
