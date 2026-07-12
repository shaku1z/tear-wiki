import { UPGRADES } from '../scripts/game-engine.js';
import gameManifest from './game-manifest.json' with { type: 'json' };

const metadataById = new Map(gameManifest.upgrades.map((upgrade) => [upgrade.id, upgrade]));
const withMetadata = (upgrade) => {
  const { tiers: serializedTiers, ...metadata } = metadataById.get(upgrade.id);
  return { ...upgrade, ...metadata };
};
const abilities = UPGRADES.map(withMetadata);

export const SPECIALS = abilities.filter((upgrade) => upgrade.progression === 'tiered');
export const UNIQUES = abilities.filter((upgrade) => upgrade.progression === 'single');
export const STACKABLES = abilities.filter((upgrade) => upgrade.progression === 'stackable');
