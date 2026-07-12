import { CONFIG } from '../scripts/game-engine.js';

export const BASE_CONFIG = structuredClone(CONFIG);

export const BASE_PLAYER = {
  hp: 100,
  maxHp: 100,
  dashCharges: 1,
  maxDashCharges: 1,
  shopRevives: 0,
  abilityRevives: 0,
  maxShield: 0,
  shield: 0,
  heal(amt) {
    this.hp = Math.min(this.maxHp, this.hp + amt);
  }
};

export const BASE_MODS = {
  onHit: [], onKill: [], onParry: [], onSlam: [],
  owned: {}, ownedList: [],
  throwRamp: 0,
  deflectPierce: false,
  deflectSplit: false,
  airBonus: 0,
  tempest: false,
  stormRecall: false,
  phantomDash: 0,
  berserk: false,
  lifesteal: 0,
  parryGuard: false,
  flowGuard: false,
  slamShield: false,
  bloodrite: false,
  phaseStep: false,
  crater: false,
  aerialRave: 0,
  ricochet: false,
  vortexRecall: false,
  slipstream: false,
  tier: {},
  stormMult: 1.85,
  killHeal: 0,
  bloodGuard: false,
  flowRegen: false,
  aegisParry: false,
  shieldBurst: false,
  razorStun: false,
  stormBurst: false,
  phantomRefund: false,
  bleedHit: 0,
  bleedDetonate: false,
  bleedNova: false,
  sunderHit: false,
  sunderShatter: false,
  sunderSpread: false,
  impale: 0,
  impaleAll: false,
  impaleRecall: false,
  tempo: 0,
  tempoMax: 1,
  tempoSurge: false,
  backlash: 0,
  backlashMark: false,
  backlashSurge: false,
  cinder: false,
  cinderSlow: false,
  cinderNova: false,
  concussive: 0,
  concStun: false,
  concRefund: false,
  parryStun: false,
  waveHeal: 0,
};

export const BASE_BLADE = {
  throwSizeMult: 1.0,
  freeRecall: false
};

function copyConfig(source, target) {
  for (let k in source) {
    if (typeof source[k] === 'object' && source[k] !== null) {
      if (!target[k]) target[k] = Array.isArray(source[k]) ? [] : {};
      copyConfig(source[k], target[k]);
    } else {
      target[k] = source[k];
    }
  }
}

export function simulate(loadout) {
  const player = { ...BASE_PLAYER };
  const mods = structuredClone(BASE_MODS);
  const blade = structuredClone(BASE_BLADE);

  // Reset global CONFIG to base state before applying
  copyConfig(BASE_CONFIG, CONFIG);

  for (const up of loadout) {
    if (up.apply) {
      up.apply({ config: CONFIG, player, mods, blade });
    }
  }

  const resultConfig = structuredClone(CONFIG);
  
  // Reset global CONFIG back to base state to not poison other tests
  copyConfig(BASE_CONFIG, CONFIG);

  return { config: resultConfig, player, mods, blade };
}
