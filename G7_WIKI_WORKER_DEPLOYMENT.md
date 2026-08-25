# G7 wiki Worker deployment foundation

Status: implemented on the isolated candidate branch
`codex/g7-wiki-worker-foundation` from wiki `main` commit
`723532d531040c576e182fc31c2acde16f723be4`. No workflow was dispatched, no
Cloudflare credential was created or used, and production remains frozen.

## Worker contract

`wrangler.jsonc` is the only deployment configuration:

- production Worker: `tear-wiki`;
- preview Worker: `tear-wiki-preview` under the named `preview` environment;
- both serve the Astro SSG output from `./dist`;
- both use `not_found_handling: 404-page` and
  `html_handling: auto-trailing-slash`;
- the production `global_fetch_strictly_public` compatibility flag and
  observability setting are preserved;
- no route or custom-domain keys are declared, preserving Cloudflare-managed
  `wiki.tearblade.com` ownership and preventing preview from binding it.

The production Worker is assets-only. Preview is explicitly a separate
`workers.dev` Worker; production deploys explicitly target the top-level
configuration with `--env=""`, while preview deploys require `--env preview`.

## Immutable build provenance

`npm run build` performs the normal Astro build and then generates
`dist/_meta/tear-wiki-build-provenance.v1.json`. The JSON is deterministic and
contains only:

- the exact wiki repository and `git rev-parse HEAD` commit;
- the canonical game repository and source SHA from the validated artifact;
- the validation run and artifact name;
- SHA-256 hashes of the exact manifest, receipt, and terminology registry
  bytes;
- the reference schema/format and terminology version.

`npm run verify:build-provenance` recomputes the current reference contract,
rechecks the registry binding, and compares the generated JSON bytes. A
deployment may additionally set `EXPECTED_WIKI_GIT_COMMIT` and
`EXPECTED_GAME_SOURCE_SHA`; mismatches fail before Wrangler runs.

## Manual deployment gates

`.github/workflows/deploy-wiki-preview.yml` and
`.github/workflows/deploy-wiki-production.yml` are manual-dispatch only. Each
requires:

1. `refs/heads/main` and `github.ref_protected == true`;
2. an exact full expected wiki SHA equal to `github.sha`;
3. an exact expected game source SHA matching the checked-in reference triplet
   and generated provenance;
4. one `npm run check:snapshot` gate;
5. the matching GitHub environment (`Preview` or `Production`); and
6. `npx --yes wrangler@4.112.0` with
   `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` supplied only by that
   environment; missing values fail before Wrangler is invoked.

The production workflow is a capability held behind the protected Production
environment; it is not an automatic release path and was not invoked in this
slice. Environment secret provisioning and any controlled preview are
separate authorized operations.

## Verification boundary

The bounded evidence for this slice is the focused Node contract suite, one
future `npm run check:snapshot` run, and a Wrangler `deploy --dry-run` against
the isolated worktree/config. A dry run is read-only remote validation; it is
not a deployment. The parent normalization plan remains the program-level
authority; this wiki checkpoint records only the deployment foundation.
