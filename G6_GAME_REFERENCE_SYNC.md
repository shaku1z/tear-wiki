# G6 game-reference synchronization

`src/data/game-reference.v1.json` and its receipt are a parallel, non-authoritative wiki snapshot. They are accepted only through `scripts/store-game-reference.mjs`, which verifies the artifact contract before an optional transactional local write.

The offline command accepts an artifact directory; API ZIP download remains a separate caller concern. Use a real local worktree/artifact directory, not a symlink or junction. The current UI, CI workflow, production deployment, and promotion/release authorization remain deferred: storing a snapshot does not publish it or make it authoritative.

`npm run check:snapshot` includes the parallel game-reference contract tests alongside the legacy wiki verifiers and Astro build. That checkpoint does not change legacy UI/build authority or authorize a workflow, deployment, promotion, or release.

Run `npm run verify:game-reference -- --artifact-dir <dir> --sha <sha> --run-id <run>` to verify. Add `--write` (or use `npm run sync:game-reference -- ...`) only after the source artifact has passed its own release gate.
