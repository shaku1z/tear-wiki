export const REFERENCE_PROMOTION_FILES = Object.freeze([
  'src/data/game-reference.v1.json',
  'src/data/game-reference.v1.receipt.json',
  'src/data/wiki-terminology.json',
]);

function fail(message) {
  throw new Error(`reference promotion state: ${message}`);
}

function lines(value, label) {
  if (typeof value !== 'string') fail(`${label} must be text`);
  if (value.length === 0) return [];
  const result = value.split(/\r?\n/);
  while (result.at(-1) === '') result.pop();
  if (result.some((line) => line.length === 0)) fail(`${label} contains an empty record`);
  return result;
}

function exactNames(value, label) {
  const actual = [...value].sort();
  const expected = [...REFERENCE_PROMOTION_FILES].sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) fail(`${label} must contain exactly the reference triplet`);
  return actual;
}

export function assertReferencePromotionState({ statusText, diffText } = {}) {
  const statusRecords = lines(statusText, 'status');
  const diffRecords = lines(diffText, 'diff');
  if (diffRecords.length === 0) {
    if (statusRecords.length !== 0) fail('an empty diff must have a clean worktree');
    return { noChange: true };
  }
  exactNames(diffRecords, 'diff');
  const statusNames = statusRecords.map((record) => {
    if (!record.startsWith(' M ')) fail('only unstaged tracked modifications are allowed after promotion');
    return record.slice(3);
  });
  exactNames(statusNames, 'status');
  if ([...statusNames].sort().some((name, index) => name !== [...diffRecords].sort()[index])) fail('status and diff paths do not match');
  return { noChange: false };
}

if (process.argv[1]?.endsWith('check-reference-promotion-state.mjs')) {
  try {
    const result = assertReferencePromotionState({ statusText: process.env.PROMOTION_STATUS, diffText: process.env.PROMOTION_DIFF });
    console.log(`no_change=${result.noChange ? 'true' : 'false'}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
