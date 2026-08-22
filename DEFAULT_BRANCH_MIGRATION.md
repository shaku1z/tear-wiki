# Canonical branch migration: `master` to `main`

This runbook changes repository authority without deploying the public wiki or
repairing the legacy game-data synchronizer. It is the G3 branch slice; G6
still owns the typed synchronization contract.

## Current preconditions

- Source repository: `shaku1z/tear-wiki`; clean `master` and `origin/master`
  at `27c67acfc076624b65e95e65d095adc4908ee21e`.
- GitHub default branch: `master`; no open pull requests.
- Ruleset `21119805` (Canonical branch authority) is active and must retain
  deletion/non-fast-forward protection, pull-request integration, required
  current `check`, and no bypass actors while it is widened to both branches.
- `validate.yml` listens to `master` and `main`; the retained snapshot check
  is `npm run check:snapshot`.
- `sync-game.yml` remains `disabled_manually`. Its legacy scheduled,
  dispatch, and direct-push contract is known-broken and must stay disabled
  and fail-closed pending G6.
- The G3 all-ref wiki bundle and annotated rollback tag are already preserved
  and verified under the program archive. Recheck them immediately before any
  mutation.
- Cloudflare production remains frozen: Worker `tear-wiki`, script tag
  `44fc17ada5584668a117415e6e71c61d`, deployment
  `bbccf944-f0fd-4ef2-b179-78557529c0ed`, version
  `b72b4f0e-5ae0-4439-9b74-cca7d3fd8d1c` at 100%, source `wrangler`, and
  `wiki.tearblade.com` enabled. Workers Build configuration is absent
  (`12040`), with no triggers or deploy hooks. Do not reconnect or publish.

## Migration order

1. Re-observe the preconditions and verify the G3 all-ref bundles plus the
   annotated `master` rollback tag. Abort on any dirty root, changed baseline,
   open PR, enabled sync workflow, or Worker/version/domain drift.
2. Extend ruleset `21119805` to include exactly
   `refs/heads/master` and `refs/heads/main`, preserving all existing rules and
   `bypass_actors: []`.
3. Create and push `main` at the exact baseline commit. Confirm both refs are
   equal, `main` is covered by the ruleset, and its required `Validate` run is
   green before continuing.
4. Create a short-lived migration branch from `main`. In one reviewed PR,
   edit only `astro.config.mjs`, `public/admin/config.yml`, `DATA_SYNC.md`,
   `CLOUDFLARE_PAGES.md`, and this file. Do not edit or enable
   `.github/workflows/sync-game.yml`; do not alter generated data or package
   scripts. Run `npm run check:snapshot` from a clean checkout, then require
   the PR `check` to pass before squash-merging into protected `main`.
5. Re-read Cloudflare settings. The correct G3 action is no-op: preserve the
   existing Worker/version/domain and absent build configuration, triggers, and
   hooks. No deployment call is permitted.
6. Change GitHub's default branch to `main` only after the protected merge and
   green check. Rename the local checkout to `main`, set `origin/main` as its
   upstream, and update `origin/HEAD` to `origin/main`.
7. Recheck the default branch, both refs, ruleset, fresh-clone selection,
   disabled sync state, Worker/version/domain/build state, and public route.
   Keep `master` present and protected as the rollback ref. Deleting `master`
   is a separate later cleanup gate and is not part of this slice.

## Authorized file edits

- `astro.config.mjs`: change the Starlight edit-link base from `/edit/master/`
  to `/edit/main/`.
- `public/admin/config.yml`: set the CMS backend branch to `main`.
- `DATA_SYNC.md`: mark the legacy synchronizer disabled/fail-closed, retain
  its event payload only as historical G6 context, and remove any claim of a
  current `master` commit or Cloudflare deployment.
- `CLOUDFLARE_PAGES.md`: retain the filename for compatibility but document
  the actual frozen `tear-wiki` Worker, version/domain, absent build config,
  empty triggers/hooks, canonical `main`, and no G3 publish.
- `DEFAULT_BRANCH_MIGRATION.md`: keep this current baseline, ordered procedure,
  and rollback/no-deploy boundary synchronized with the executed slice.
- `.github/workflows/validate.yml`: no source edit; preserve both branch
  filters through rollback verification.
- `.github/workflows/sync-game.yml`: no source edit or enable; G6 owns repair.

## Rollback

- Before the default switch, a failed file check, PR, or merge is rolled back
  by closing/reverting the migration PR and leaving `master` as default. Do
  not force-push either branch or touch Cloudflare.
- After the default switch, any drift requires changing the GitHub default back
  to `master`, restoring the known-good ruleset target, and reverting the
  reviewed docs commit through a protected PR. Keep both refs intact.
- Because G3 performs no Cloudflare mutation, Worker rollback should be a
  no-op. If external drift is observed, restore the recorded no-build,
  no-trigger state and version/domain before resuming. Never deploy to repair
  a branch migration.

## Explicit non-claims

- Branch migration does not repair the retired `js/` synchronizer or prove
  current game data.
- `npm run check:snapshot` proves the retained wiki snapshot and Astro build;
  it does not certify a live deployment.
- Checked-in Cloudflare documentation does not prove live Worker source or
  deployment provenance; the read-only Worker observations above are the
  authority for this slice.
