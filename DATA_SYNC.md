# Canonical game-reference synchronization

The game repository remains the sole gameplay authority. The wiki consumes a
validated, byte-preserved game-reference artifact and records its exact source
commit, validation run, schema, and manifest hash. The wiki never regenerates
game data from a sibling checkout as a development or build side effect.

## Checked-in snapshot verification

Run the bounded offline gate:

```text
npm run verify:game-reference-artifact
```

This validates the checked-in manifest and receipt through the same strict
schema contract used by the server-only adapter, pins the current source SHA,
successful validation run, manifest SHA-256, schema version, and Final Five
roster, and performs no network request or write.

`npm run check:snapshot` includes this gate, the terminology contract, the
game-reference tests, tier/viewer checks, and the Astro build. It is evidence
of a coherent checked-in wiki snapshot; it does not merge, deploy, or promote
anything.

## Canonical source flow

The approved explicit synchronization entry points are:

```text
npm run verify:game-reference -- --sha <40-character-sha> --run-id <successful-Validate-run>
npm run sync:game-reference -- --sha <40-character-sha> --run-id <successful-Validate-run>
```

Both commands first prove custody of the fixed canonical sibling `../Tear`:
real non-aliased directory, exact Git top-level, strict `origin` repository,
checked-out `main`, clean porcelain including untracked files, `HEAD` equal to
the requested SHA, and locally tracked `refs/remotes/origin/main` equal to the
same SHA. No remote ref lookup or fetch is performed by this guard.

The verify form validates the remote artifact without changing the wiki. The
sync form accepts the wrapper's explicit write mode and promotes the verified
manifest, receipt, and current terminology snapshot together with rollback on
installation failure. Low-level fetch/store commands remain
verify-only diagnostics and reject direct write flags.

The protected cross-repository path is the `repository_dispatch` action
`tear-game-deployed`. It accepts only the exact game SHA, validation run,
artifact ID, and canonical base64 ZIP fields; public game ref/run/artifact
metadata supplies the digest authority before the same triple promotion. The
workflow checks the promoted snapshot once and opens a SHA-named PR containing
only the three reference files. It does not write `main`, merge, or deploy.

## Historical boundary

The former JavaScript-era snapshot pipeline and its disabled automatic
publisher have been retired. The immutable G4 terminology receipt remains in
the repository as historical provenance and is not a current data source.
New authored pages must use `src/data/game-reference.mjs` and its receipt.

## Editing rules

- The artifact files are explicitly `-text` in `.gitattributes`; preserve their
  bytes exactly.
- Modern views must consume the validated server-only adapter, never a copied
  configuration object.
- Documentation may explain gameplay concepts, but must not present
  unpublished runtime tuning as current.
- Compatibility readers and historical records may retain old identifiers only
  where the terminology registry explicitly scopes them.
