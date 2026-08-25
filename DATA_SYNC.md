# Game data synchronization

The game repository is the sole authority for gameplay values. The wiki never owns a duplicate of configuration, upgrade, enemy, stage, boss, mode, or achievement values.

## Local development

`npm run sync:game` is a retained legacy migration command. It reads the sibling
`../Tear` checkout when it exists, records its Git commit, rebuilds
`src/scripts/game-engine.js`, and creates `src/data/game-manifest.json`.

Use `GAME_SOURCE=remote npm run sync:game` to pull the canonical GitHub source. Set `GAME_COMMIT_SHA=<sha>` to synchronize an exact revision.

`npm run dev`, `npm run start`, and `npm run build` no longer run this legacy
synchronizer automatically. They invoke Astro directly so a stale, dirty, or
untrusted sibling checkout cannot rewrite committed wiki data as a side effect
of opening or building the site. Run `npm run sync:game` only when deliberately
working on the legacy migration snapshot and inspect its diff before committing.

## Production synchronization (manual; legacy workflow disabled)

The legacy [sync-game.yml](.github/workflows/sync-game.yml) workflow remains
checked in for migration traceability and is externally `disabled_manually`.
Its source still declares scheduled, manual-dispatch, and `tear-game-updated`
dispatch paths plus a direct `git push`; none of those paths may publish while
it is disabled. This slice does not re-enable, replace, or edit that workflow.
The known-broken legacy JS-era synchronizer is not repaired or treated as
evidence by this branch migration.

The historical dispatch payload was:

```json
{ "event_type": "tear-game-updated", "client_payload": { "game_commit": "<full-sha>" } }
```

This payload is retained as migration context only. G6 will replace the
contract with an exact validated typed manifest, a reviewed update into
protected `main`, and an explicit source-SHA record. This slice provides the
manual source-custody wrapper below; it makes no wiki merge or Cloudflare
deployment claim.

## G6 canonical game-reference source

The approved manual synchronization entry point is:

```text
npm run sync:canonical-game-reference -- --sha <40-character-sha> --run-id <successful-Validate-run> [--write]
```

Both `--sha` and `--run-id` are mandatory. Before any GitHub request, artifact
transport, or wiki write, the wrapper proves custody of the fixed canonical
`../Tear` sibling. It requires a real directory (not a symlink or junction),
the exact Git top-level, origin exactly `github.com/shaku1z/tear`, checked-out
branch `main`, zero porcelain including untracked files, `HEAD` equal to the
requested SHA, and the locally tracked `refs/remotes/origin/main` equal to the
same SHA. It intentionally does not run `git ls-remote` or fetch: the requested
SHA must already be present in the locally verified canonical checkout.

Without `--write`, the wrapper only verifies the exact artifact through the
existing transport. With `--write`, it stores the verified bytes through the
existing transactional store. The preserved unknown untracked game file is
therefore a deliberate fail-closed test case and is never changed by the wiki.

The legacy `sync-game.yml` workflow remains disabled as described above. No
automatic event hook, direct push, wiki merge, or Cloudflare deployment is
installed by this slice; promotion remains a separate protected-main action.

## Editing rules

- Modern gameplay pages must use the validated `src/data/game-reference.mjs`
  adapter and its artifact receipt. Legacy gameplay values may come from
  `src/data/game-manifest.json` or the synchronized engine module only while
  the migration snapshot is retained.
- Documentation may contain editorial explanation, but never authoritative numeric mechanics copied from the game.
- New legacy data domains must be added to `scripts/sync-config.js` and
  `scripts/generate-game-data.mjs` together; modern reference domains belong
  in the game-reference artifact contract instead.
- Generated files are committed deliberately so every published wiki revision records the game revision it documents.
