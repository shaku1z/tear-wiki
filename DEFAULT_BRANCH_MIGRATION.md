# G3 Wiki canonical branch migration and `master` retirement

**Status:** executed. `main` is the sole canonical development branch. The
obsolete `master` ref was retained only until the recovery checkpoint, then
retired in the separately authorized G3 gate. Production and synchronization
remain frozen.

## Canonical and recovery state

- Repository: `shaku1z/tear-wiki`.
- Canonical branch: protected `main`; GitHub default and `origin/HEAD` select
  `main`.
- Retired branch: `master` at
  `27c67acfc076624b65e95e65d095adc4908ee21e` before deletion.
- The old branch is not the recovery authority. Recovery is by the annotated
  tag and verified bundles listed below, followed by an explicitly authorized
  temporary branch recreation if required.

## Executed migration record

- Ruleset `21119805` was widened during migration, preserving deletion and
  non-fast-forward protection, pull-request integration, required `check`,
  strict status policy, and no bypass actors.
- `main` was created from the clean `master` baseline and validated before
  becoming default. The reviewed documentation migration was PR #3, squash
  merged through protection at `ec461168…`.
- GitHub default branch and local remotes were switched to `main`; the local
  checkout tracks `origin/main`.
- After the supplemental recovery bundle and restore proof passed, ruleset
  `21119805` was narrowed to `refs/heads/main` only. Remote and local
  `master` were then deleted and stale remote-tracking refs pruned.
- `.github/workflows/validate.yml` runs push validation only for `main`; its
  pull-request trigger remains active.

## Recovery materials

- Baseline annotated tag:
  `archive/g3-wiki-canonical-master-20260822` at the retired `master` tip.
- Pre-migration all-ref bundle:
  `bundles/wiki-all-refs-g3-20260822.bundle`.
- Phase-4 all-ref bundle:
  `bundles/wiki-phase4-predelete-all-20260822.bundle`.
- Supplemental post-migration all-ref bundle and final-main tag are recorded
  in `cleanup-receipts/phase6-wiki-master-retirement` and cover both the old
  tagged `master` commit and the final protected `main` tip.
- Migration PR head is additionally preserved by
  `archive/g3-wiki-main-migration-head-20260822`.

## Synchronization boundary

The former automatic synchronization workflow was `disabled_manually` and
fail-closed during the earlier migration. G6 now removes that obsolete
workflow and its JS-era data path; the protected-main release flow uses only
the validated game-reference artifact and explicit canonical promotion.

## Cloudflare boundary

The `tear-wiki` Worker was not changed. Production remains on version
`b72b4f0e-5ae0-4439-9b74-cca7d3fd8d1c` at 100%, with script tag
`44fc17ada5584668a117415e6e71c61d`, source `wrangler`, and enabled production
domain `wiki.tearblade.com`. Workers Build configuration remains absent
(`12040`); build triggers, deploy hooks, and script triggers remain empty. No
deployment or source/build reconnection is part of G3.

## Recovery procedure

1. Restore a disposable mirror from the supplemental or pre-migration bundle
   and verify the annotated baseline tag and final-main tag.
2. If a branch rollback is explicitly authorized, recreate a temporary branch
   from the tagged baseline; do not treat the deleted `master` ref as required
   storage.
3. Restore GitHub default/ruleset state through reviewed administrative
   changes, then re-run the proportional snapshot and branch checks.
4. Keep Cloudflare frozen and sync disabled while recovering. Never force-push
   or deploy as part of a recovery drill.

This document records branch authority and recovery, not current game-data
freshness or production certification. Those remain G6/G7 responsibilities.
