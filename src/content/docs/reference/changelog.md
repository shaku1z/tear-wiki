---
title: Changelog
description: Current synchronized game snapshot and release-tracking protocol.
---

import GameSourceStatus from '../../../components/GameSourceStatus.astro';

<GameSourceStatus />

## Live snapshot

The wiki is built from an exact committed game revision. The source marker above is the revision represented by every generated dossier, configuration readout, palette swatch, upgrade listing, and Builder calculation on this deployment.

## Release tracking

When the game repository updates, the wiki synchronization workflow refreshes its generated data and Cloudflare Pages deploys the resulting wiki commit. That makes the source marker the authoritative answer to “which version does this page describe?”

Narrative patch notes belong in the game’s release notes. This reference page deliberately avoids copying balance values, rosters, or version claims that could become stale.
