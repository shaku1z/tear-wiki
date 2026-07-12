import { UPGRADES } from '../scripts/game-engine.js';
export const SPECIALS = UPGRADES.filter(u => u.tiers);
export const UNIQUES  = UPGRADES.filter(u => u.unique && !u.tiers);
export const STACKABLES = UPGRADES.filter(u => !u.unique && !u.tiers);
