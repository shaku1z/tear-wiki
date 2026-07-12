# Game data synchronization

The game repository is the sole authority for gameplay values. The wiki never owns a duplicate of configuration, upgrade, enemy, stage, boss, mode, or achievement values.

## Local development

`npm run sync:game` first reads the sibling `../Tear` checkout when it exists, records its Git commit, rebuilds `src/scripts/game-engine.js`, and creates `src/data/game-manifest.json`.

Use `GAME_SOURCE=remote npm run sync:game` to pull the canonical GitHub source. Set `GAME_COMMIT_SHA=<sha>` to synchronize an exact revision.

Both `npm run dev` and `npm run build` run the full sync command first. Do not bypass it.

## Production synchronization

The wiki receives `tear-game-updated` repository-dispatch events in [sync-game.yml](.github/workflows/sync-game.yml). The event payload must include the pushed game commit:

```json
{ "event_type": "tear-game-updated", "client_payload": { "game_commit": "<full-sha>" } }
```

The workflow fetches that exact source revision, validates/builds the wiki, and commits the generated snapshot. Cloudflare Pages deploys the corresponding `master` commit.

The hourly schedule is only a recovery mechanism for a missed event; the dispatch event is the primary freshness path.

## Required main-repository hook

The main game repository must send the dispatch after a successful push to its default branch when gameplay source files change. This wiki intentionally does not install that hook because the project handoff forbids changes outside `tear-wiki`.

The game workflow needs a repository-scoped token with permission to dispatch to `shaku1z/tear-wiki`. It is stored there as `WIKI_DEPLOY_TOKEN`. Its trigger watches `js/**` and sends `github.sha` only after the game’s own checks pass.

## Editing rules

- Gameplay values must come from `src/data/game-manifest.json` or the synchronized engine module.
- Documentation may contain editorial explanation, but never authoritative numeric mechanics copied from the game.
- New data domains must be added to `scripts/sync-config.js` and `scripts/generate-game-data.mjs` together.
- Generated files are committed deliberately so every published wiki revision records the game revision it documents.
