# G6 game-reference synchronization

`src/data/game-reference.v1.json` and its receipt are a parallel, non-authoritative wiki snapshot. They are accepted only through `scripts/store-game-reference.mjs`, which verifies the artifact contract before an optional transactional local write.

These two published byte-hashed files are explicitly `-text` in `.gitattributes`. This prevents Windows `core.autocrlf` from changing the manifest bytes and invalidating the receipt SHA-256; consumers must preserve the published bytes exactly.

The offline command accepts an artifact directory; API ZIP download remains a separate caller concern. Use a real local worktree/artifact directory, not a symlink or junction. The current UI, CI workflow, production deployment, and promotion/release authorization remain deferred: storing a snapshot does not publish it or make it authoritative.

`npm run check:snapshot` includes the parallel game-reference contract tests alongside the legacy wiki verifiers and Astro build. That checkpoint does not change legacy UI/build authority or authorize a workflow, deployment, promotion, or release.

Run `npm run verify:game-reference -- --artifact-dir <dir> --sha <sha> --run-id <run>` to verify. Add `--write` (or use `npm run sync:game-reference -- ...`) only after the source artifact has passed its own release gate.

For the opt-in transport, set `GAME_REFERENCE_GITHUB_TOKEN` (or `GITHUB_TOKEN`) and run `npm run fetch:game-reference -- --sha <sha> --run-id <run>`. It requires the canonical `shaku1z/tear` successful `Validate` push run on `main`, specifically workflow ID `322540049` at `.github/workflows/ci.yml`, an exact unexpired artifact name, and an archive containing only the two published files. Redirected archive downloads are constrained to approved storage hosts and never receive the GitHub token. Add `--write` only to store the already-validated bytes locally; this command does not dispatch a workflow or deploy anything.
