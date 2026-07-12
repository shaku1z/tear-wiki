# Cloudflare Pages deployment

This wiki is a static Astro site deployed through Cloudflare Pages.

## Project configuration

Connect the `shaku1z/tear-wiki` repository in Cloudflare Pages and use:

- Production branch: `master`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `22`

Cloudflare Pages deploys every push to `master`; pull requests can use preview deployments.

## Game-driven updates

The wiki Action accepts an exact game commit through `repository_dispatch`, regenerates the synchronized engine snapshot, validates the build, and commits the resulting data to `master`. Cloudflare Pages then deploys that commit automatically.

If a Cloudflare Pages project is already connected, no Cloudflare token or Wrangler configuration is needed for this flow.
