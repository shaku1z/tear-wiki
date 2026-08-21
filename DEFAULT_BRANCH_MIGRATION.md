# Canonical Branch Migration: `master` to `main`

This procedure changes repository and deployment authority without changing
the public wiki content contract. The legacy game synchronization contract is
replaced separately; it must not be treated as repaired by a branch rename.

## Preconditions

- Record the exact `master` commit, current Worker version, custom-domain
  routes, Workers Builds connection state, workflow inventory, and public
  response headers.
- Preserve all refs in a verified Git bundle and create an annotated rollback
  tag at the recorded `master` commit.
- Require the `check` status from the `Validate` workflow on `master`.
- Confirm the retained snapshot passes `npm run check:snapshot` from a clean
  checkout. Do not invoke the known-broken JS-era synchronizer as evidence.
- Keep the public `tear-wiki` Worker frozen throughout the branch change.

## Migration slice

1. Create `main` at the exact protected `master` commit. Do not delete or
   rewrite `master`.
2. Extend the canonical-branch ruleset to cover `main` before accepting any
   change on it: block deletion and force-push, require pull requests, require
   current `check`, and allow no routine bypass.
3. Update branch-sensitive repository references together: workflow push
   filters, synchronization commit target, documentation edit links, local
   clone instructions, and release runbooks.
4. Update the `tear-wiki` Worker build/source configuration to use only the
   reviewed `main` path. Preserve its Worker name, custom-domain routes, and
   rollback version. Do not create a second Pages or Workers deployment path.
5. Run `Validate` on the exact proposed `main` commit and independently verify
   its retained-snapshot build artifact.
6. Change GitHub's default branch to `main`, refresh local remotes, and confirm
   a fresh clone selects `main`.
7. Recheck the Worker source/build settings after the default-branch change.
   A branch rename must not silently reactivate Workers Builds or publish.

## Acceptance and rollback

- The public Worker must remain on its pre-migration version until a later
  authorized release gate deploys a validated wiki artifact.
- `main` and `master` must initially point to the same commit, with `main`
  protected and green before it becomes the default.
- Keep `master` protected as a rollback ref until the new default, workflows,
  Worker source, custom domain, and fresh-clone behavior are all recorded.
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
