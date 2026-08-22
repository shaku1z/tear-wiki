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
for a later authorized build.

## Game-driven updates

The legacy game-data workflow is disabled and fail-closed. G6 will replace it
with a typed-manifest flow that validates an exact game SHA and enters the
protected `main` branch through review. This document does not claim current
source freshness or a production deployment from the repository.
