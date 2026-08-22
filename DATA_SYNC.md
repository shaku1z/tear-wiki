# Game data synchronization

The game repository is the sole authority for gameplay values. The wiki never owns a duplicate of configuration, upgrade, enemy, stage, boss, mode, or achievement values.

## Local development

`npm run sync:game` first reads the sibling `../Tear` checkout when it exists, records its Git commit, rebuilds `src/scripts/game-engine.js`, and creates `src/data/game-manifest.json`.

Use `GAME_SOURCE=remote npm run sync:game` to pull the canonical GitHub source. Set `GAME_COMMIT_SHA=<sha>` to synchronize an exact revision.

Both `npm run dev` and `npm run build` run the full sync command first. Do not bypass it.

## Production synchronization (disabled pending G6)

The legacy [sync-game.yml](.github/workflows/sync-game.yml) workflow is
currently disabled and fail-closed. Its source still declares scheduled,
manual-dispatch, and `tear-game-updated` dispatch paths plus a direct
`git push`, but none of those paths may publish during G3. The known-broken
legacy JS-era synchronizer is not repaired or treated as evidence by this
branch migration.

The historical dispatch payload was:

```json
{ "event_type": "tear-game-updated", "client_payload": { "game_commit": "<full-sha>" } }
```

This payload is retained as migration context only. G6 will replace the
contract with an exact validated typed manifest, a reviewed update into
protected `main`, and an explicit source-SHA record. No current production
synchronization, wiki commit, or Cloudflare deployment is claimed here.

## Deferred G6 replacement contract

The game repository may eventually send an exact source SHA after its own
successful canonical-branch checks. This wiki intentionally does not install
or enable that hook during G3; the owning G6 change must reconcile the
`tear-game-deployed`/`tear-game-updated` event mismatch and replace the
retired `js/**` source contract.

## Editing rules

- Gameplay values must come from `src/data/game-manifest.json` or the synchronized engine module.
- Documentation may contain editorial explanation, but never authoritative numeric mechanics copied from the game.
- New data domains must be added to `scripts/sync-config.js` and `scripts/generate-game-data.mjs` together.
- Generated files are committed deliberately so every published wiki revision records the game revision it documents.
