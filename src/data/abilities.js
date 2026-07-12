import { UPGRADES } from '../scripts/game-engine.js';
export const SPECIALS = UPGRADES.filter(u => u.special);
export const UNIQUES  = UPGRADES.filter(u => u.unique && !u.special);
export const STACKABLES = UPGRADES.filter(u => !u.unique && !u.special);
