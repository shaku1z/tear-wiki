export const MODEL_PROFILES = {
  charger: { scale: 1.55, focusY: -4, role: 'Pressure', range: 'Close', motif: 'rush' },
  ranged: { scale: 1.55, focusY: -6, role: 'Control', range: 'Long', motif: 'sight' },
  flyer: { scale: 1.7, focusY: 12, role: 'Airspace', range: 'Close', motif: 'altitude' },
  bomber: { scale: 1.55, focusY: -5, role: 'Denial', range: 'Long', motif: 'blast' },
  armored: { scale: 1.35, focusY: -5, role: 'Bulwark', range: 'Close', motif: 'armor' },
  support: { scale: 1.6, focusY: -6, role: 'Force multiplier', range: 'Mid', motif: 'link' },
  wraith: { scale: 1.6, focusY: 4, role: 'Disruption', range: 'Close', motif: 'phase' },
  chimera: { scale: 1.5, focusY: -6, role: 'Adaptive', range: 'Variable', motif: 'shift' },
  warden: { scale: 0.72, focusY: -18, role: 'Arena control', range: 'Variable', motif: 'boss' },
  'iron-colossus': { scale: 0.58, focusY: -20, role: 'Siege', range: 'Mid', motif: 'boss' },
  aldric: { scale: 0.64, focusY: -22, role: 'Duelist', range: 'Variable', motif: 'boss' },
  'the-echo': { scale: 0.76, focusY: -16, role: 'Mirror', range: 'Variable', motif: 'boss' },
  'the-source': { scale: 0.62, focusY: 0, role: 'Final threat', range: 'Variable', motif: 'boss' },
};

export const BOSS_MODELS = new Set(['warden', 'iron-colossus', 'aldric', 'the-echo', 'the-source']);

export function getModelProfile(model) {
  return MODEL_PROFILES[model] || { scale: 1.4, focusY: 0, role: 'Unknown', range: 'Variable', motif: 'neutral' };
}
