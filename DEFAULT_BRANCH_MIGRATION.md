# Canonical Branch Migration: `master` to `main`

This procedure changes repository and deployment authority without changing
the public wiki content contract. The legacy game synchronization contract is
replaced separately; it must not be treated as repaired by a branch rename.

## Preconditions

- Record the exact `master` commit, current Worker version, custom-domain
  routes, Workers Builds connection state, workflow inventory, and public
  response headers.
- Cloudflare Workers Builds was disconnected from `tear-wiki` on 2026-08-21.
  Configuration reads now fail closed with Cloudflare error `12040`, while the
  existing `tear-wiki` Worker remains present. Do not reconnect repository
  builds during the branch migration.
- The audited source baseline is clean `origin/master` at
  `b57efdaa8774d889555f4708edbe5b1cc6d3ab17`. The stale local `master` at
  `f183b49` is not a migration source.
- Preserve all refs in a verified Git bundle and create an annotated rollback
  tag at the recorded `master` commit.
- Ruleset `21119805`, **Canonical branch authority**, currently protects only
  `master`: it blocks deletion and force-push, requires pull requests, and
  requires the current `check` job from the `Validate` workflow with no bypass
  actors. Preserve those controls while extending the ruleset to `main`.
- Confirm the retained snapshot passes `npm run check:snapshot` from a clean
  checkout. Do not invoke the known-broken JS-era synchronizer as evidence.
- Keep the public `tear-wiki` Worker frozen throughout the branch change.

## Migration slice

1. Extend ruleset `21119805` to cover both `master` and the future `main`
   before creating the new branch: block deletion and force-push, require pull
   requests, require current `check`, and allow no routine bypass.
2. Create `main` from the exact clean `origin/master` baseline. This is a new
   protected ref plus a later default-branch switch—not a destructive rename.
   Do not delete or rewrite `master`.
3. Update branch-sensitive repository references together: workflow push
   filters, synchronization commit target, documentation edit links, local
   clone instructions, and release runbooks.
   The existing synchronizer ends with a direct `git push`, which the protected
   branch rejects; its replacement must open a reviewed synchronization PR or
   use a narrowly documented automation exception. Do not add a broad bypass.
   Also reconcile the current event mismatch: the game emits
   `tear-game-deployed`, while the wiki listens for `tear-game-updated`.
4. Update the `tear-wiki` Worker build/source configuration to use only the
   reviewed `main` path. Preserve its Worker name, custom-domain routes, and
   rollback version. Do not create a second Pages or Workers deployment path.
5. Run `Validate` on the exact proposed `main` commit and independently verify
   its retained-snapshot build artifact.
6. Change GitHub's default branch to `main`, refresh local remotes, and confirm
   a fresh clone selects `main`.
7. Recheck the Worker source/build settings after the default-branch change.
   A branch rename must not silently reactivate Workers Builds or publish.
8. Keep wiki PR #1, **DO NOT MERGE — UNSAFE**, unmerged. Its attempted Worker
   conversion failed and does not establish source attribution for the live
   Worker.

## Acceptance and rollback

- The public Worker must remain on its pre-migration version until a later
  authorized release gate deploys a validated wiki artifact.
- `main` and `master` must initially point to the same commit, with `main`
  protected and green before it becomes the default.
- Keep `master` protected as a rollback ref until the new default, workflows,
  Worker source, custom domain, and fresh-clone behavior are all recorded.
- After switching the default, record the default-branch API result, ruleset
  targets, fresh-clone selected branch, Worker source/build settings, preserved
  `wiki.tearblade.com` route, and confirmation that no production publish
  occurred.
- If any branch, workflow, Worker-source, or domain check differs from the
  recorded baseline, restore the old default branch and Worker configuration;
  do not delete either ref.
- Delete `master` only in the separately approved cleanup gate after the
  rollback record and bundle restore have been proven.

## Explicit non-claims

- This migration does not repair synchronization from the retired game
  `js/` tree.
- `check:snapshot` proves the retained wiki snapshot and Astro build; it does
  not prove that snapshot is current with the game.
- Checked-in Cloudflare configuration does not prove the live Worker source or
  deployment state.
