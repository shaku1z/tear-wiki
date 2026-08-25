// The Builder share format is deliberately small, versioned, and independent
// from the game runtime. It carries only selections from the published upgrade
// catalog; it does not attempt to serialize callbacks or simulated state.
export const LOADOUT_VERSION = 2;
export const MAX_ENCODED_LENGTH = 4096;
export const MAX_LOADOUT_ENTRIES = 60;
export const MAX_UNPUBLISHED_STACK_COUNT = 99;

const ROOT_KEYS = ['v', 'specials', 'uniques', 'stackables'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function catalogIndex(catalog) {
  if (!Array.isArray(catalog)) return new Map();

  return new Map(catalog
    .filter((upgrade) => isRecord(upgrade) && typeof upgrade.id === 'string')
    .map((upgrade) => {
      const kind = upgrade.kind || upgrade.rule?.kind;
      const tiers = Array.isArray(upgrade.tiers) ? upgrade.tiers : [];
      return [upgrade.id, {
        id: upgrade.id,
        kind,
        maxStacks: Number.isInteger(upgrade.maxStacks) && upgrade.maxStacks > 0 ? upgrade.maxStacks : null,
        maxTier: kind === 'tiered' ? tiers.length + 1 : 0,
      }];
    }));
}

function hasExactKeys(value, keys) {
  return isRecord(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right)));
}

function toBytes(value) {
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(value);
  return Uint8Array.from(unescape(encodeURIComponent(value)), (character) => character.charCodeAt(0));
}

function fromBytes(value) {
  if (typeof TextDecoder === 'function') return new TextDecoder('utf-8', { fatal: true }).decode(value);
  return decodeURIComponent(Array.from(value, (byte) => `%${byte.toString(16).padStart(2, '0')}`).join(''));
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function base64UrlDecode(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ENCODED_LENGTH || !/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  try {
    if (typeof atob === 'function') {
      const binary = atob(padded);
      return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }
    return Uint8Array.from(Buffer.from(padded, 'base64'));
  } catch {
    return null;
  }
}

function normalizeState(state, catalog) {
  if (!isRecord(state)) return null;
  const index = catalogIndex(catalog);
  const specials = [];
  const uniques = [];
  const stackables = [];
  const selectedIds = new Set();

  if (!isRecord(state.specials) || !Array.isArray(state.uniques) || !isRecord(state.stackables)) return null;

  for (const [id, tier] of Object.entries(state.specials)) {
    const upgrade = index.get(id);
    if (!upgrade || upgrade.kind !== 'tiered' || !Number.isInteger(tier) || tier < 1 || tier > upgrade.maxTier) return null;
    if (selectedIds.has(id)) return null;
    selectedIds.add(id);
    specials.push([id, tier]);
  }

  const seenUniques = new Set();
  for (const id of state.uniques) {
    if (typeof id !== 'string' || seenUniques.has(id)) return null;
    const upgrade = index.get(id);
    if (!upgrade || upgrade.kind !== 'unique') return null;
    if (selectedIds.has(id)) return null;
    seenUniques.add(id);
    selectedIds.add(id);
    uniques.push(id);
  }

  for (const [id, count] of Object.entries(state.stackables)) {
    const upgrade = index.get(id);
    const maximum = upgrade?.maxStacks ?? MAX_UNPUBLISHED_STACK_COUNT;
    if (!upgrade || upgrade.kind !== 'stackable' || !Number.isInteger(count) || count < 1 || count > maximum) return null;
    if (selectedIds.has(id)) return null;
    selectedIds.add(id);
    stackables.push([id, count]);
  }

  if (specials.length + uniques.length + stackables.length > MAX_LOADOUT_ENTRIES) return null;

  return {
    specials: sortedObject(specials),
    uniques: [...uniques].sort((left, right) => left.localeCompare(right)),
    stackables: sortedObject(stackables),
  };
}

function parsePayload(value, catalog) {
  if (!hasExactKeys(value, ROOT_KEYS) || value.v !== LOADOUT_VERSION) return null;
  return normalizeState({ specials: value.specials, uniques: value.uniques, stackables: value.stackables }, catalog);
}

export function encodeLoadout(loadoutState, catalog = []) {
  const normalized = normalizeState(loadoutState, catalog);
  if (!normalized) return null;
  const payload = { v: LOADOUT_VERSION, ...normalized };
  const encoded = base64UrlEncode(toBytes(JSON.stringify(payload)));
  return encoded.length <= MAX_ENCODED_LENGTH ? encoded : null;
}

export function decodeLoadout(encoded, catalog = []) {
  const bytes = base64UrlDecode(encoded);
  if (!bytes) return null;
  try {
    return parsePayload(JSON.parse(fromBytes(bytes)), catalog);
  } catch {
    return null;
  }
}
