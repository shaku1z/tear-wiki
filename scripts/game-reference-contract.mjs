import { createHash } from 'node:crypto';

const REPOSITORY = 'shaku1z/tear';
const MAX_INPUT_BYTES = 1024 * 1024;
const ACTIVE_WEAPONS = ['sword', 'hammer', 'greatsword', 'chainblade', 'riftlock'];
const RETIRED_WEAPONS = ['spear', 'ringblade'];
const CATALOGS = {
  achievements: { count: 98, ids: ['first_blood', 'centurion', 'thousand_cuts', 'reaper', 'annihilation', 'cull', 'massacre', 'bomber_baiter', 'first_parry', 'deflector', 'bulletstorm', 'perfect_hand', 'juggler', 'titan_drop', 'updraft_artist', 's_rank', 'velocity', 'long_shot', 'wave_10', 'wave_25', 'wave_50', 'wave_100', 'stage_clear', 'campaign', 'all_biomes', 'first_boss', 'boss_5', 'boss_25', 'boss_gauntlet', 'boss_nohit', 'clean_wave', 'clean_stage', 'marathon', 'iron', 'comeback', 'first_buy', 'collector', 'rich', 'veteran', 'well_rounded', 'student', 'boss_warden', 'boss_colossus', 'boss_aldric', 'boss_echo', 'boss_source', 'witness', 'endless_25', 'endless_50', 'endless_75', 'endless_100', 'adv_hard', 'adv_extreme', 'adv_all', 'endless_50_hard', 'endless_100_extreme', 'adv_flawless', 'overkill', 'collateral', 'surgeon', 'inferno', 'floor_is_lava', 'gravity_defied', 'friendly_fire', 'weapon_master', 'arsenal', 'speedrunner', 'close_call', 'warden_deflect', 'colossus_throw', 'aldric_interrupt', 'echo_parry', 'source_speed', 'space_program', 'pinball', 'rainbow_pain', 'surgical', 'air_assassination', 'no_takebacks', 'butterfingers', 'glass_cannon', 'deflector_shield', 'heavy_boots', 'the_setup', 'return_to_sender', 'chain_reaction', 'matador', 'cinematic_kill', 'phoenix_full', 'horde_breaker', 'exodia', 'master_combat', 'master_skill', 'master_progress', 'master_boss', 'master_survival', 'master_mastery', 'completionist'] },
  bosses: { count: 5, ids: ['warden', 'colossus', 'aldric', 'echo', 'source'] },
  modes: { count: 7, ids: ['campaign', 'endless', 'gauntlet', 'playground', 'tutorial', 'bossonly', 'sandbox'] },
  stages: { count: 5, ids: ['grounds', 'undercroft', 'crimson-fields', 'voidspire', 'tear'] },
  upgrades: { count: 60, ids: ['vitality', 'keen_edge', 'fleet', 'quick_recovery', 'long_reach', 'heavy_swing', 'deadly_throw', 'vampiric', 'air_superiority', 'tough_hide', 'air_dash', 'afterimage', 'hard_turn', 'bounty', 'glass_cannon', 'bloodrite', 'riposte', 'flow_guard', 'aegis', 'phase_step', 'backfire', 'crater', 'aerial_rave', 'seismic_slam', 'detonate', 'adrenaline', 'throw_momentum', 'throw_giant', 'parry_pierce', 'parry_split', 'tempest', 'storm_recall', 'phantom_dash', 'boomerang', 'ricochet', 'vortex_recall', 'slipstream', 'berserk', 'last_stand', 'whetstone', 'gyroblade', 'quickdraw', 'steady_hand', 'wide_guard', 'counterforce', 'tailwind', 'kinetic', 'bulwark', 'showtime', 'fortune', 'rupture', 'sunder', 'impale', 'stormbank', 'overrun', 'sever', 'tempo', 'backlash', 'cinder', 'concussive'] },
  weapons: { count: 5, ids: ACTIVE_WEAPONS },
};
const ENEMY_FAMILIES = ['charger', 'ranged', 'flyer', 'bomber', 'armored', 'priest', 'mender', 'herald', 'anchor', 'wraith', 'chimera'];
const ENEMY_AFFIXES = ['tank', 'swift', 'rapid', 'volley', 'armed', 'warded'];
const ENEMY_PRESETS = ['ranged:rapid,volley', 'charger:tank,armed', 'armored:warded,tank'];
const DIFFICULTIES = ['easy', 'normal', 'hard', 'extreme', 'onehit'];

function fail(message) { throw new Error(`Invalid game-reference artifact: ${message}`); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, keys, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(`${label} keys do not match`);
}
function exactArray(value, expected, label) {
  if (!Array.isArray(value) || value.length !== expected.length || value.some((item, index) => item !== expected[index])) fail(`${label} does not match the canonical sequence`);
}
function text(bytes, label) {
  if (!(typeof bytes === 'string' || bytes instanceof Uint8Array)) fail(`${label} must be UTF-8 bytes or a string`);
  const encoded = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  if (encoded.byteLength === 0 || encoded.byteLength > MAX_INPUT_BYTES) fail(`${label} must be nonempty and at most 1 MiB`);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(encoded); } catch { fail(`${label} must be strict UTF-8`); }
}
function catalog(collections, name, expectation) {
  const envelope = collections[name];
  exactKeys(envelope, ['items', 'status'], `collections.${name}`);
  if (envelope.status !== 'complete') fail(`collections.${name}.status must be complete`);
  if (!Array.isArray(envelope.items) || envelope.items.length !== expectation.count) fail(`collections.${name} count does not match`);
  const ids = envelope.items.map((item) => isRecord(item) ? item.id : undefined);
  exactArray(ids, expectation.ids, `collections.${name} ids`);
  if (new Set(ids).size !== ids.length) fail(`collections.${name} ids must be unique`);
}

/** Validates the signed-pipeline game-reference artifact consumed by the wiki. */
export function validateGameReferenceArtifact({ manifestBytes, receiptBytes, expectedSha, expectedRunId }) {
  if (typeof expectedSha !== 'string' || !/^[0-9a-f]{40}$/.test(expectedSha)) fail('expectedSha must be a 40-character lowercase SHA');
  if (typeof expectedRunId !== 'string' || !/^[1-9][0-9]*$/.test(expectedRunId)) fail('expectedRunId must be a canonical positive integer string');
  const manifestText = text(manifestBytes, 'manifestBytes');
  const receiptText = text(receiptBytes, 'receiptBytes');
  if (!manifestText.endsWith('\n')) fail('manifest must end with a newline');
  let manifest, receipt;
  try { manifest = JSON.parse(manifestText); receipt = JSON.parse(receiptText); } catch { fail('files must be valid JSON'); }
  const manifestSha256 = createHash('sha256').update(manifestText).digest('hex');

  exactKeys(receipt, ['format', 'repository', 'sourceSha', 'gameReferenceFormat', 'gameReferenceSchemaVersion', 'terminologyVersion', 'artifactName', 'manifestFilename', 'manifestSha256', 'receiptFilename', 'retentionDays', 'generatedBy', 'validationRunId', 'validationEvent', 'validationRef'], 'receipt');
  if (typeof receipt.manifestSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.manifestSha256)) fail('receipt.manifestSha256 must be a lowercase SHA-256');
  const receiptExpected = { format: 'tear-game-reference-artifact-receipt.v1', repository: REPOSITORY, sourceSha: expectedSha, gameReferenceFormat: 'game-reference.v1', gameReferenceSchemaVersion: 2, terminologyVersion: 'g4-terminology-v1', artifactName: `tear-game-reference-v1-${expectedSha}`, manifestFilename: 'game-reference.v1.json', manifestSha256, receiptFilename: 'game-reference.v1.receipt.json', retentionDays: 90, generatedBy: 'pnpm publish:game-reference', validationRunId: expectedRunId, validationEvent: 'push', validationRef: 'refs/heads/main' };
  for (const [key, value] of Object.entries(receiptExpected)) if (receipt[key] !== value) fail(`receipt.${key} does not match`);

  exactKeys(manifest, ['collections', 'format', 'roster', 'schemaVersion', 'source', 'terminologyVersion'], 'manifest');
  if (manifest.format !== 'game-reference.v1' || manifest.schemaVersion !== 2 || manifest.terminologyVersion !== 'g4-terminology-v1') fail('manifest schema envelope does not match');
  exactKeys(manifest.source, ['repository', 'sha'], 'manifest.source');
  if (manifest.source.repository !== REPOSITORY || manifest.source.sha !== expectedSha) fail('manifest source does not match');
  exactKeys(manifest.roster, ['activeWeaponIds', 'id', 'retiredWeaponIds', 'schemaVersion'], 'manifest.roster');
  if (manifest.roster.id !== 'final-five' || manifest.roster.schemaVersion !== 'final-five-v1') fail('manifest roster envelope does not match');
  exactArray(manifest.roster.activeWeaponIds, ACTIVE_WEAPONS, 'active weapon ids');
  exactArray(manifest.roster.retiredWeaponIds, RETIRED_WEAPONS, 'retired weapon ids');

  exactKeys(manifest.collections, ['achievements', 'bosses', 'enemies', 'modes', 'public-tuning', 'stages', 'upgrades', 'weapons'], 'collections');
  for (const [name, expectation] of Object.entries(CATALOGS)) catalog(manifest.collections, name, expectation);
  const enemies = manifest.collections.enemies;
  exactKeys(enemies, ['items', 'status'], 'collections.enemies');
  if (enemies.status !== 'complete') fail('collections.enemies.status must be complete');
  exactKeys(enemies.items, ['affixes', 'families', 'presets'], 'collections.enemies.items');
  if (!Array.isArray(enemies.items.families) || !Array.isArray(enemies.items.affixes) || !Array.isArray(enemies.items.presets)) fail('enemy catalog records must be arrays');
  for (const item of enemies.items.families) {
    exactKeys(item, ['id', 'variants'], 'enemy family record');
    if (typeof item.id !== 'string' || !Array.isArray(item.variants)) fail('enemy family record is malformed');
  }
  for (const item of enemies.items.affixes) {
    exactKeys(item, ['color', 'id'], 'enemy affix record');
    if (typeof item.id !== 'string' || typeof item.color !== 'string') fail('enemy affix record is malformed');
  }
  exactArray(enemies.items.families.map((item) => item.id), ENEMY_FAMILIES, 'enemy family ids');
  exactArray(enemies.items.affixes.map((item) => item.id), ENEMY_AFFIXES, 'enemy affix ids');
  if (new Set(enemies.items.families.map((item) => item.id)).size !== ENEMY_FAMILIES.length || new Set(enemies.items.affixes.map((item) => item.id)).size !== ENEMY_AFFIXES.length) fail('enemy ids must be unique');
  for (const item of enemies.items.presets) {
    exactKeys(item, ['affixIds', 'familyId'], 'enemy preset record');
    if (typeof item.familyId !== 'string' || !Array.isArray(item.affixIds) || item.affixIds.some((id) => typeof id !== 'string')) fail('enemy preset record is malformed');
  }
  const presetIds = enemies.items.presets.map((item) => `${item.familyId}:${item.affixIds.join(',')}`);
  exactArray(presetIds, ENEMY_PRESETS, 'enemy preset ids');
  if (new Set(presetIds).size !== ENEMY_PRESETS.length) fail('enemy preset ids must be unique');
  const tuning = manifest.collections['public-tuning'];
  exactKeys(tuning, ['items', 'status'], 'collections.public-tuning');
  if (tuning.status !== 'complete') fail('collections.public-tuning.status must be complete');
  exactKeys(tuning.items, ['difficultyCatalog', 'schemaVersion'], 'collections.public-tuning.items');
  if (tuning.items.schemaVersion !== 1) fail('public tuning schema must be 1');
  if (!Array.isArray(tuning.items.difficultyCatalog) || tuning.items.difficultyCatalog.some((item) => !isRecord(item) || typeof item.id !== 'string')) fail('difficulty catalog records are malformed');
  exactArray(tuning.items.difficultyCatalog.map((item) => item.id), DIFFICULTIES, 'difficulty ids');
  if (new Set(tuning.items.difficultyCatalog.map((item) => item.id)).size !== DIFFICULTIES.length) fail('difficulty ids must be unique');
  return { manifest, receipt, manifestSha256 };
}
