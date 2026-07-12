import { simulate } from './src/lib/simulate.js';
import { UPGRADES } from './src/scripts/game-engine.js';

const keenEdge = UPGRADES.find(u => u.id === 'keen_edge');
const glassCannon = UPGRADES.find(u => u.id === 'glass_cannon');

const loadout = [keenEdge, keenEdge, glassCannon];

const result = simulate(loadout);
console.log(result.config.blade.damageScale);
