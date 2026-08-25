# Cloudflare Worker deployment (legacy filename)

The public wiki is served by the existing `tear-wiki` Cloudflare Worker, not
by a Cloudflare Pages project. The canonical repository branch is `main`, but
branch naming does not authorize a build or deployment.

## Frozen production state

- Worker script tag: `44fc17ada5584668a117415e6e71c61d`.
- Production deployment: `bbccf944-f0fd-4ef2-b179-78557529c0ed` with version
  `b72b4f0e-5ae0-4439-9b74-cca7d3fd8d1c` at 100%.
- Deployment source: `wrangler`.
- Custom domain: `wiki.tearblade.com` enabled in production.
- Workers Build configuration is absent (`12040`); triggers and deploy hooks
  are both empty (`[]`).

Production is frozen through the branch migration. Do not reconnect Workers
Builds, add a trigger or hook, create a Pages project, or publish a new
version in G3. `SITE_URL` may still be set to `https://wiki.tearblade.com`
for a later authorized build. The checked-in G7 foundation does not execute a
deployment and does not change this frozen state.

## G7 checked-in deployment foundation

The repository now contains a minimal `wrangler.jsonc` for the existing
production Worker `tear-wiki`. It is an assets-only SSG configuration pointing
at `./dist`, with `404-page` handling and `auto-trailing-slash` HTML routing.
The existing production compatibility flag
`global_fetch_strictly_public` and observability setting remain explicit. No
route or custom-domain key is present, so the existing
`wiki.tearblade.com` association remains managed by Cloudflare rather than
being recreated from this repository.

The named `preview` environment is a separate Worker, `tear-wiki-preview`,
and uses its own `workers.dev` address. Production and preview cannot target
one another through the checked-in configuration or workflows.

`npm run build` emits the deterministic public
`dist/_meta/tear-wiki-build-provenance.v1.json`. It binds the wiki commit,
the canonical game source SHA, validation run, manifest hash, receipt hash,
and terminology-registry hash. The build and snapshot checks fail closed if
the checked-in manifest, receipt, and registry no longer agree.

The preview and production workflows are manual-dispatch only, require a
protected `main` ref and exact expected wiki/game SHAs, use the corresponding
GitHub environment, and pin `npx --yes wrangler@4.112.0`. They have not been
run. Cloudflare credentials are referenced only as environment secrets; this
slice creates no secrets and performs no deployment.

## Game-driven updates

The legacy game-data workflow is disabled and fail-closed. G6 replaces it
with a typed-manifest flow that validates an exact game SHA and enters the
protected `main` branch through review. G7 adds only the reviewed deployment
foundation described above; it does not claim current source freshness beyond
the checked-in receipt or a production deployment from the repository.
