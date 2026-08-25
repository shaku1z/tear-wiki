import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertCanonicalGameWorktree, CANONICAL_GAME_ROOT, parseArgs } from './sync-canonical-game-reference.mjs';

const REMOTE = 'https://github.com/shaku1z/tear.git';

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

async function fixture(action) {
  const root = await mkdtemp(join(tmpdir(), 'tear-canonical-source-'));
  try {
    git(root, ['init', '--initial-branch=main']);
    git(root, ['config', 'user.email', 'tear-test@example.invalid']);
    git(root, ['config', 'user.name', 'TEAR Test']);
    await writeFile(join(root, 'tracked.txt'), 'tracked\n');
    git(root, ['add', 'tracked.txt']);
    git(root, ['commit', '-m', 'fixture']);
    git(root, ['remote', 'add', 'origin', REMOTE]);
    const head = git(root, ['rev-parse', 'HEAD']);
    git(root, ['update-ref', 'refs/remotes/origin/main', head]);
    return await action({ root, head });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('requires exact SHA and run arguments', () => {
  assert.throws(() => parseArgs([]), /both --sha and --run-id are required/);
  assert.throws(() => parseArgs(['--sha', 'a'.repeat(40)]), /both --sha and --run-id are required/);
  assert.throws(() => parseArgs(['--sha', 'A'.repeat(40), '--run-id', '1']), /lowercase SHA/);
  assert.throws(() => parseArgs(['--sha', 'a'.repeat(40), '--run-id', '01']), /positive integer/);
  assert.deepEqual(parseArgs(['--sha', 'a'.repeat(40), '--run-id', '1', '--write']), { sha: 'a'.repeat(40), runId: '1', write: true });
});

test('accepts an exact clean canonical custody record', async () => {
  await fixture(async ({ root, head }) => {
    const result = await assertCanonicalGameWorktree({ expectedSha: head, gameRoot: root, expectedRoot: root });
    assert.equal(result.root, root);
    assert.equal(result.branch, 'main');
    assert.equal(result.head, head);
    assert.equal(result.originMain, head);
  });
});

test('rejects an untracked file before any transport can run', async () => {
  await fixture(async ({ root, head }) => {
    await mkdir(join(root, 'scripts'));
    await writeFile(join(root, 'scripts', 'game-reference-contract-data.mjs'), 'preserve this file\n');
    await assert.rejects(
      () => assertCanonicalGameWorktree({ expectedSha: head, gameRoot: root, expectedRoot: root }),
      /clean, including untracked files/,
    );
  });
});

test('rejects non-main, non-canonical remotes, and stale tracking refs', async () => {
  await fixture(async ({ root, head }) => {
    git(root, ['switch', '-c', 'feature']);
    await assert.rejects(() => assertCanonicalGameWorktree({ expectedSha: head, gameRoot: root, expectedRoot: root }), /checked-out branch must be main/);
  });
  await fixture(async ({ root, head }) => {
    git(root, ['remote', 'set-url', 'origin', 'https://github.com/example/not-tear.git']);
    await assert.rejects(() => assertCanonicalGameWorktree({ expectedSha: head, gameRoot: root, expectedRoot: root }), /origin must be exactly/);
  });
  await fixture(async ({ root, head }) => {
    git(root, ['remote', 'set-url', 'origin', 'https://github.com:444/shaku1z/tear.git']);
    await assert.rejects(() => assertCanonicalGameWorktree({ expectedSha: head, gameRoot: root, expectedRoot: root }), /origin must be exactly/);
  });
  await fixture(async ({ root, head }) => {
    const tree = git(root, ['write-tree']);
    const stale = git(root, ['commit-tree', tree, '-p', head, '-m', 'stale tracking ref']);
    git(root, ['update-ref', 'refs/remotes/origin/main', stale]);
    await assert.rejects(() => assertCanonicalGameWorktree({ expectedSha: head, gameRoot: root, expectedRoot: root }), /refs\/remotes\/origin\/main/);
  });
});

test('rejects an aliased canonical root', async () => {
  await fixture(async ({ root, head }) => {
    const alias = join(root, 'alias');
    try {
      await import('node:fs/promises').then(({ symlink }) => symlink(root, alias, 'junction'));
    } catch {
      try {
        await import('node:fs/promises').then(({ symlink }) => symlink(root, alias, 'dir'));
      } catch (error) {
        if (error?.code === 'EPERM' || error?.code === 'EACCES') return;
        throw error;
      }
    }
    await assert.rejects(() => assertCanonicalGameWorktree({ expectedSha: head, gameRoot: alias, expectedRoot: alias }), /symlink or junction/);
  });
});

test('the preserved current unknown game file is rejected by the actual fixed-root guard', async (t) => {
  let entry;
  try {
    entry = await lstat(join(CANONICAL_GAME_ROOT, 'scripts', 'game-reference-contract-data.mjs'));
  } catch {
    t.skip('the local canonical game checkout is not present with the preserved unknown file');
    return;
  }
  if (!entry.isFile()) {
    t.skip('the preserved game entry is not a regular file');
    return;
  }
  const status = git(CANONICAL_GAME_ROOT, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!status.includes('scripts/game-reference-contract-data.mjs')) {
    t.skip('the preserved game entry is not currently untracked');
    return;
  }
  const head = git(CANONICAL_GAME_ROOT, ['rev-parse', 'HEAD']);
  await assert.rejects(() => assertCanonicalGameWorktree({ expectedSha: head }), /clean, including untracked files/);
});
