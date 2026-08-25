# G6 game-reference synchronization

`src/data/game-reference.v1.json` and its receipt are a parallel, non-authoritative wiki snapshot. They are accepted only through `scripts/store-game-reference.mjs`, which verifies the artifact contract before an optional transactional local write. The game repository remains the sole gameplay authority; the wiki records the exact source SHA it has reviewed.

These two published byte-hashed files are explicitly `-text` in `.gitattributes`. This prevents Windows `core.autocrlf` from changing the manifest bytes and invalidating the receipt SHA-256; consumers must preserve the published bytes exactly.

The low-level offline command accepts an artifact directory; API ZIP download remains a separate transport concern. Use a real local worktree/artifact directory, not a symlink or junction. The modern wiki UI consumes the validated adapter, but storing a snapshot does not make it authoritative for the game, publish it, merge it, or authorize a deployment.

`npm run check:snapshot` includes the game-reference contract tests alongside the retained legacy wiki verifiers and Astro build. It is a bounded validation checkpoint; it does not authorize a workflow, deployment, promotion, or release.

The canonical aliases are `npm run verify:game-reference -- --sha <sha> --run-id <run>` and `npm run sync:game-reference -- --sha <sha> --run-id <run>`; both use the custody guard, with the latter enabling the transactional write (its built-in `--write` must not be repeated). The lower-level `npm run verify:game-reference-artifact -- --artifact-dir <dir> --sha <sha> --run-id <run>` and `npm run sync:game-reference-artifact -- ...` aliases are retained only for already-fetched artifact diagnostics and do not prove custody of `../Tear`.

For the approved canonical-source flow, run `npm run sync:canonical-game-reference -- --sha <40-character-sha> --run-id <successful-Validate-run> [--write]`. The wrapper first checks the fixed `../Tear` checkout: real non-aliased path, exact Git top-level, strict `origin` repository, branch `main`, clean porcelain including untracked files, `HEAD == --sha`, and `refs/remotes/origin/main == --sha`. It performs no remote ref lookup or fetch, and it invokes no GitHub/token transport until those checks pass. The `--write` form then delegates to the existing verified transport and transactional store.

For the underlying transport, set `GAME_REFERENCE_GITHUB_TOKEN` (or
`GITHUB_TOKEN`) as needed. It requires the canonical `shaku1z/tear`
successful `Validate` push run on `main`, specifically workflow ID `322540049`
at `.github/workflows/ci.yml`, an exact unexpired artifact name, and an
archive containing only the two published files. Redirected archive downloads
are constrained to approved storage hosts and never receive the GitHub token.
The legacy [sync-game.yml](.github/workflows/sync-game.yml) remains externally
disabled and untouched in this slice; no workflow dispatch, direct push, or
Cloudflare deployment is performed.
