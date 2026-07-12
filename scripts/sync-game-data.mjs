import { spawnSync } from 'node:child_process';

function run(script) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}

run('scripts/sync-config.js');
run('scripts/generate-game-data.mjs');
run('scripts/verify-game-data.mjs');
run('scripts/verify-tier-system.mjs');
