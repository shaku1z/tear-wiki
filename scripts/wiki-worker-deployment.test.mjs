import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const text = async (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('Worker config keeps production and preview assets isolated', async () => {
  const config = JSON.parse(await text('wrangler.jsonc'));
  assert.equal(config.name, 'tear-wiki');
  assert.equal(config.compatibility_date, '2026-08-25');
  assert.deepEqual(config.compatibility_flags, ['global_fetch_strictly_public']);
  assert.equal(config.workers_dev, false);
  assert.deepEqual(config.observability, { enabled: true });
  assert.deepEqual(config.assets, {
    directory: './dist',
    not_found_handling: '404-page',
    html_handling: 'auto-trailing-slash',
  });
  assert.equal(config.env.preview.name, 'tear-wiki-preview');
  assert.equal(config.env.preview.workers_dev, true);
  assert.deepEqual(config.env.preview.assets, config.assets);
  assert.notEqual(config.name, config.env.preview.name);
});

test('deployment workflows are manual, protected-main, exact-reference, environment-scoped, and pinned', async () => {
  const preview = await text('.github/workflows/deploy-wiki-preview.yml');
  const production = await text('.github/workflows/deploy-wiki-production.yml');
  for (const [name, workflow, environment] of [['preview', preview, 'Preview'], ['production', production, 'Production']]) {
    assert.match(workflow, /^on:\s*\n\s+workflow_dispatch:/mu, `${name} must be workflow_dispatch-only`);
    for (const forbidden of ['push:', 'pull_request:', 'schedule:', 'repository_dispatch:']) assert.doesNotMatch(workflow, new RegExp(`^\\s*${forbidden.replace(':', ':?')}\\s*$`, 'mu'), `${name} has an automatic trigger`);
    assert.match(workflow, /expected_wiki_head:/u);
    assert.match(workflow, /expected_game_source_sha:/u);
    assert.match(workflow, /github\.ref_protected/u);
    assert.match(workflow, /refs\/heads\/main/u);
    assert.match(workflow, /EXPECTED_WIKI_GIT_COMMIT/u);
    assert.match(workflow, /EXPECTED_GAME_SOURCE_SHA/u);
    assert.match(workflow, new RegExp(`environment: ${environment}\\b`, 'u'));
    assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID:/u);
    assert.match(workflow, /CLOUDFLARE_API_TOKEN:/u);
    assert.match(workflow, /-n "\$CLOUDFLARE_ACCOUNT_ID"/u);
    assert.match(workflow, /-n "\$CLOUDFLARE_API_TOKEN"/u);
    assert.equal((workflow.match(/npm run check:snapshot/g) ?? []).length, 1, `${name} must run the bounded snapshot gate once`);
    assert.match(workflow, /npx --yes wrangler@4\.112\.0 deploy (?:--env preview |--env="" )?--config wrangler\.jsonc/u);
    assert.doesNotMatch(workflow, /cloudflare\/wrangler-action/u);
  }
  assert.match(preview, /deploy --env preview --config wrangler\.jsonc/u);
  assert.match(production, /deploy --env="" --config wrangler\.jsonc/u);
  assert.doesNotMatch(production, /deploy --env preview/u);
  assert.doesNotMatch(production, /tear-wiki-preview/u);
});

test('build pipeline generates and checks immutable provenance', async () => {
  const packageJson = JSON.parse(await text('package.json'));
  assert.match(packageJson.scripts.build, /astro build && node scripts\/generate-build-provenance\.mjs/u);
  assert.match(packageJson.scripts['check:snapshot'], /npm run build/u);
  assert.match(packageJson.scripts['check:snapshot'], /npm run verify:build-provenance/u);
  assert.match(packageJson.scripts['test:game-reference'], /scripts\/build-provenance\.test\.mjs/u);
  assert.match(packageJson.scripts['test:game-reference'], /scripts\/wiki-worker-deployment\.test\.mjs/u);
  const generator = await text('scripts/build-provenance.mjs');
  assert.match(generator, /verifyGameReferenceSnapshot/u);
  assert.match(generator, /receiptSha256/u);
  assert.match(generator, /registrySha256/u);
  assert.doesNotMatch(generator, /Date\.now|new Date/u);
  const entrypoint = await text('scripts/generate-build-provenance.mjs');
  assert.match(entrypoint, /EXPECTED_WIKI_GIT_COMMIT/u);
  assert.match(entrypoint, /EXPECTED_GAME_SOURCE_SHA/u);
  const pageCheck = await text('scripts/check-modern-reference-pages.mjs');
  assert.match(pageCheck, /dist\/reference\/weapon-roster\/index\.html/u);
  assert.match(pageCheck, /dist\/weapons\/\$\{id\}\/index\.html/u);
  for (const id of ['greatsword', 'chainblade', 'riftlock']) assert.match(pageCheck, new RegExp(`['"]${id}['"]`, 'u'));
});
