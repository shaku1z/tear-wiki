# Tear Wiki Agent Rules

## Fundamental Design Principle: Data-Driven Documentation
**The wiki must NEVER contain hardcoded game values.**
Every single stat, cost, HP value, speed, or ability description must be dynamically rendered by components that read from the `src/scripts/game-engine.js` source of truth.

If the main game codebase updates, adds new abilities, or deletes mechanics, the wiki must automatically reflect these changes on the next build without requiring manual markdown edits.

When generating documentation:
1. Write Astro components (e.g., `<MetaShopTable />`, `<EnemyStats name="charger" />`) that parse the game engine objects (`CONFIG`, `SHOP`, `VARIANTS`).
2. Inject these components into `.mdx` files instead of writing static markdown tables.
3. The build pipeline (`npm run build`) automatically syncs the latest `game-engine.js` from the game repository before rendering, guaranteeing 100% accuracy.
