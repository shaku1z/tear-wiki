import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lstat, realpath } from 'node:fs/promises';
import { dirname, normalize, resolve } from 'node:path';
import { fetchVerifyAndStore } from './fetch-game-reference-artifact.mjs';

const WIKI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CANONICAL_GAME_ROOT = resolve(WIKI_ROOT, '..', 'Tear');
const CANONICAL_REPOSITORY = 'https://github.com/shaku1z/tear';

function fail(message) {
  throw new Error(`canonical game-reference sync: ${message}`);
}

function validSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function validRun(value) {
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value);
}

function samePath(left, right) {
  const normalizeCase = process.platform === 'win32' ? (value) => normalize(value).toLowerCase() : normalize;
  return normalizeCase(left) === normalizeCase(right);
}

async function realDirectory(path, label, expectedRoot) {
  const absolute = resolve(path);
  let entry;
  try {
    entry = await lstat(absolute);
  } catch {
    fail(`${label} does not exist at ${absolute}`);
  }
  if (entry.isSymbolicLink()) fail(`${label} must not be a symlink or junction`);
  if (!entry.isDirectory()) fail(`${label} must be a real directory`);
  let canonical;
  try {
    canonical = await realpath(absolute);
  } catch {
    fail(`${label} could not be resolved`);
  }
  if (!samePath(absolute, canonical)) fail(`${label} must not be a symlink or junction`);
  if (expectedRoot && !samePath(canonical, resolve(expectedRoot))) fail(`${label} is not the fixed canonical sibling ../Tear`);
  return canonical;
}

function gitValue(root, args, label) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.error || result.status !== 0) fail(`${label} could not be verified`);
  return result.stdout.trim();
}

function canonicalRemote(value) {
  let remote = value.trim();
  if (remote.startsWith('git@github.com:')) remote = `https://github.com/${remote.slice('git@github.com:'.length)}`;
  if (remote.startsWith('ssh://git@github.com/')) remote = `https://github.com/${remote.slice('ssh://git@github.com/'.length)}`;
  let parsed;
  try {
    parsed = new URL(remote);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com' || parsed.port || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
  const path = parsed.pathname.replace(/\/+$/, '').replace(/\.git$/, '');
  return `https://github.com${path}`.toLowerCase();
}

/**
 * Proves that the requested source SHA is checked out in the one canonical
 * local game worktree before any network or wiki write is attempted.
 * `gameRoot` and `expectedRoot` are injectable only for isolated tests; the
 * CLI always uses the fixed sibling `../Tear`.
 */
export async function assertCanonicalGameWorktree({ expectedSha, gameRoot = CANONICAL_GAME_ROOT, expectedRoot = CANONICAL_GAME_ROOT }) {
  if (!validSha(expectedSha)) fail('--sha must be a 40-character lowercase SHA');
  const root = await realDirectory(gameRoot, 'canonical game root', expectedRoot);
  const topLevel = resolve(gitValue(root, ['rev-parse', '--show-toplevel'], 'Git top-level'));
  if (!samePath(topLevel, root)) fail('Git top-level does not equal the canonical game root');

  const remote = canonicalRemote(gitValue(root, ['remote', 'get-url', 'origin'], 'origin remote'));
  if (remote !== CANONICAL_REPOSITORY) fail('origin must be exactly the GitHub repository shaku1z/tear');

  const branch = gitValue(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'], 'checked-out branch');
  if (branch !== 'main') fail(`checked-out branch must be main (found ${branch || 'detached HEAD'})`);

  const status = gitValue(root, ['status', '--porcelain=v1', '--untracked-files=all'], 'worktree status');
  if (status) fail(`canonical game worktree must be clean, including untracked files (${status.split(/\r?\n/, 1)[0]})`);

  const head = gitValue(root, ['rev-parse', '--verify', 'HEAD'], 'HEAD');
  if (head !== expectedSha) fail(`checked-out HEAD ${head} does not equal requested --sha ${expectedSha}`);

  const trackedMain = gitValue(root, ['show-ref', '--verify', '--hash', 'refs/remotes/origin/main'], 'refs/remotes/origin/main');
  if (trackedMain !== expectedSha) fail(`refs/remotes/origin/main ${trackedMain} does not equal requested --sha ${expectedSha}`);

  return { root, repository: CANONICAL_REPOSITORY, branch, head, originMain: trackedMain };
}

export function parseArgs(args) {
  const values = new Map();
  let write = false;
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--write') {
      if (write) fail('duplicate --write');
      write = true;
      continue;
    }
    if (!['--sha', '--run-id'].includes(flag) || values.has(flag) || index + 1 === args.length || args[index + 1].startsWith('--')) fail(`invalid CLI argument ${flag}`);
    values.set(flag, args[++index]);
  }
  if (!values.has('--sha') || !values.has('--run-id')) fail('both --sha and --run-id are required');
  if (!validSha(values.get('--sha'))) fail('--sha must be a 40-character lowercase SHA');
  if (!validRun(values.get('--run-id'))) fail('--run-id must be a canonical positive integer string');
  return { sha: values.get('--sha'), runId: values.get('--run-id'), write };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const custody = await assertCanonicalGameWorktree({ expectedSha: options.sha });
  const result = await fetchVerifyAndStore(options);
  console.log(`canonical game-reference synced from ${custody.repository}@${custody.head} (${result.manifestSha256.slice(0, 12)})${options.write ? '; stored' : '; verified only'}`);
}

if (process.argv[1] && samePath(resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
