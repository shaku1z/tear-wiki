# G6 game-reference synchronization

`src/data/game-reference.v1.json`, its receipt, and the terminology registry snapshot are the current validated wiki reference state. They are accepted only through the guarded canonical promotion path, which verifies the artifact contract before a rollback-transactional three-file write. The game repository remains the sole gameplay authority; the wiki records the exact source SHA it has reviewed.

These three published reference files are explicitly `-text` in `.gitattributes`; the manifest and receipt are byte-hashed, and the registry is emitted as canonical LF JSON. This prevents Windows `core.autocrlf` from changing the published state; consumers must preserve the published bytes exactly.

The checked-in snapshot command is intentionally no-argument: `npm run verify:game-reference-artifact`. It reads only the committed manifest and receipt, and must not be passed `--artifact-dir`, `--sha`, or `--run-id`. For a separately downloaded two-file directory, the verify-only diagnostic is explicitly named `npm run verify:artifact-directory -- --artifact-dir <directory> --sha <40-character-sha> --run-id <successful-Validate-run>`; its CLI rejects `--write`. API ZIP download remains a separate transport concern. Use a real local worktree/artifact directory, not a symlink or junction. The modern wiki UI consumes the validated adapter, but storing a snapshot does not make it authoritative for the game, publish it, merge it, or authorize a deployment.

`npm run check:snapshot` includes the game-reference contract tests, current terminology/source/receipt verification, tier/viewer checks, and Astro build. It is a bounded validation checkpoint; it does not authorize a workflow, deployment, promotion, or release.

The canonical aliases are `npm run verify:game-reference -- --sha <sha> --run-id <run>` and `npm run sync:game-reference -- --sha <sha> --run-id <run>`; both use the custody guard, with the latter enabling the rollback-transactional three-file promotion (its built-in `--write` must not be repeated). Only the canonical wrapper may invoke the promotion after custody and artifact validation. The artifact-directory verifier and fetch transport remain verify-only diagnostics; their direct CLIs reject `--write`.

For the approved canonical-source flow, run `npm run sync:canonical-game-reference -- --sha <40-character-sha> --run-id <successful-Validate-run> [--write]`. The wrapper first checks the fixed `../Tear` checkout: real non-aliased path, exact Git top-level, strict `origin` repository, branch `main`, clean porcelain including untracked files, `HEAD == --sha`, and `refs/remotes/origin/main == --sha`. It performs no remote ref lookup or fetch, and it invokes no GitHub/token transport until those checks pass. The `--write` form then validates the incoming artifact against those external inputs and promotes manifest, receipt, and registry together; failed installation rolls all three files back.

For the underlying verify-only transport, set `GAME_REFERENCE_GITHUB_TOKEN` (or
`GITHUB_TOKEN`) as needed. It requires the canonical `shaku1z/tear`
successful `Validate` push run on `main`, specifically workflow ID `322540049`
at `.github/workflows/ci.yml`, an exact unexpired artifact name, and an
archive containing only the two published files. Redirected archive downloads
are constrained to approved storage hosts and never receive the GitHub token.
No workflow dispatch, direct push, or Cloudflare deployment is performed by
this repository-side verification flow.

## Protected cross-repository promotion

The protected `sync-game-reference.yml` workflow accepts only the
`repository_dispatch` action `tear-game-deployed`. Its client payload has
exactly four fields: `game_commit`, `validation_run_id`, `artifact_id`, and
`artifact_zip_base64`. The consumer rejects local CLI arguments and runs only
inside the protected wiki `repository_dispatch` context.

The consumer independently reads the public game `refs/heads/main`, Validate
run, and run-artifact metadata without a GitHub credential. It requires the
current main SHA, workflow ID `322540049`, path `.github/workflows/ci.yml`, a
successful protected-main push, the exact unique unexpired artifact identity,
and its immutable `sha256:` digest. The decoded event ZIP must be canonical
base64, no larger than 48 KiB, match the public artifact size and digest, and
contain only the two hardened reference files before the external SHA/run
contract and triple promotion are applied.

After `npm ci`, the workflow runs `npm run check:snapshot` once, confirms that
only the manifest, receipt, and terminology registry changed, and creates or
reuses `codex/sync-game-reference-<sha>` as a pull request against `main`. It
never pushes `main`, merges, or deploys. Because the branch and pull request
are created with the workflow `GITHUB_TOKEN`, GitHub may suppress a separate
`pull_request` Validate run; the sync workflow's own snapshot gate is the
validation evidence until a separately authorized check is configured.
