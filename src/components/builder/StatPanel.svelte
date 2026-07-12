<script>
  import { selectedAbilities } from '../../stores/loadout.js';
  import { simulate, BASE_CONFIG } from '../../lib/simulate.js';
  import SynergyPanel from './SynergyPanel.svelte';

  $: sim = simulate($selectedAbilities);
  $: c = sim.config;
  $: m = sim.mods;
  $: p = sim.player;

  // -- OFFENSE --
  $: minSwingBase = (c.blade.minHitSpeed) * c.blade.damageScale;
  $: rawSwingBase = (c.blade.maxSpeed) * c.blade.damageScale;
  $: cappedSwingBase = Math.min(rawSwingBase, c.blade.maxDamage);
  
  $: maxPowerSlam = cappedSwingBase 
    * c.blade.slamMultiplier 
    * (1 + c.blade.slamPowerBonus) 
    * (1 + m.airBonus) 
    * (1 + m.aerialRave)
    * (m.stormMult || 1)
    * (m.sunderHit ? 1.3 : 1)
    * (c.player.dmgTakenMult > 1 ? 1.3 : 1);
    
  $: maxLaunchSpeed = c.blade.launchPower * (1 + c.blade.risingLaunchBonus);

  $: throwReleaseMax = c.blade.throw.speed + (c.blade.throw.speedFromSwing * c.blade.maxSpeed);
  $: cappedThrowSpeed = Math.min(throwReleaseMax, c.blade.throw.maxSpeed);
  $: throwDmg = c.blade.throw.damage + (cappedThrowSpeed * c.blade.throw.damageFromSpeed);
  $: baseline = simulate([]);
  $: baselineSwing = Math.min(baseline.config.blade.maxSpeed * baseline.config.blade.damageScale, baseline.config.blade.maxDamage);
  $: baselineSlam = baselineSwing * baseline.config.blade.slamMultiplier * (1 + baseline.config.blade.slamPowerBonus);
  $: baselineThrowSpeed = Math.min(baseline.config.blade.throw.speed + (baseline.config.blade.throw.speedFromSwing * baseline.config.blade.maxSpeed), baseline.config.blade.throw.maxSpeed);
  $: baselineThrow = baseline.config.blade.throw.damage + (baselineThrowSpeed * baseline.config.blade.throw.damageFromSpeed);
  $: buildIdentity = [
    (m.airBonus || m.aerialRave) && 'AERIAL PRESSURE',
    (m.parryGuard || m.parryStun || m.deflectPierce || m.deflectSplit) && 'PARRY CONTROL',
    (m.ricochet || m.vortexRecall || m.throwRamp || m.impale) && 'THROW LOOP',
    (m.lifesteal || m.bloodrite || p.maxShield || p.maxHp > 100) && 'SUSTAIN',
    c.player.dmgTakenMult > 1 && 'HIGH RISK',
    (m.cinder || m.bleedHit || m.sunderHit) && 'STATUS ENGINE',
  ].filter(Boolean).slice(0, 3);

  function delta(value, base, suffix = '') {
    const difference = value - base;
    if (Math.abs(difference) < 0.005) return 'BASELINE';
    return `${difference > 0 ? '+' : ''}${Number.isInteger(difference) ? difference : difference.toFixed(2)}${suffix}`;
  }

  // -- SCORING --
  function calcScore(current, base, maxFactor = 2) {
    let ratio = current / base;
    if (ratio < 1) ratio = 1 - ((1 - ratio) / 2);
    return Math.min(100, Math.max(0, (ratio / maxFactor) * 100));
  }

  $: agilityScore = calcScore(c.player.moveSpeed * p.maxDashCharges, BASE_CONFIG.player.moveSpeed * 1, 3.5);
  $: lethalityScore = calcScore(cappedSwingBase * (1 + m.airBonus), (BASE_CONFIG.blade.maxSpeed) * BASE_CONFIG.blade.damageScale, 2.5);
  $: controlScore = Math.min(100, 40 + (m.cinderSlow ? 15 : 0) + (m.razorStun || m.concStun || m.parryStun ? 25 : 0) + (m.sunderHit ? 20 : 0));
  $: sustainScore = Math.min(100, 20 + (m.lifesteal * 15) + (m.bloodrite ? 20 : 0) + (p.maxShield * 15) + (m.parryGuard ? 15 : 0) + ((p.maxHp - 100)/2));

  function getBlocks(score) {
    const totalBlocks = 10;
    const activeBlocks = Math.floor((score / 100) * totalBlocks);
    return Array(totalBlocks).fill(0).map((_, i) => i < activeBlocks);
  }
</script>

<div class="telemetry">
  <div class="build-identity">
    <span class="identity-label">BUILD DNA</span>
    <div class="identity-tags">
      {#if buildIdentity.length}
        {#each buildIdentity as identity}<span>{identity}</span>{/each}
      {:else}
        <span>BASELINE FRAME</span>
      {/if}
    </div>
    <p>Every readout is compared against an unmodified engine simulation.</p>
  </div>
  <div class="radar-header">
    <div class="radar-row">
      <span class="label">AGL</span>
      <div class="block-meter">
        {#each getBlocks(agilityScore) as active}
          <div class="block b-agl" class:active></div>
        {/each}
      </div>
    </div>
    <div class="radar-row">
      <span class="label">LTH</span>
      <div class="block-meter">
        {#each getBlocks(lethalityScore) as active}
          <div class="block b-lth" class:active></div>
        {/each}
      </div>
    </div>
    <div class="radar-row">
      <span class="label">CTL</span>
      <div class="block-meter">
        {#each getBlocks(controlScore) as active}
          <div class="block b-ctl" class:active></div>
        {/each}
      </div>
    </div>
    <div class="radar-row">
      <span class="label">SUS</span>
      <div class="block-meter">
        {#each getBlocks(sustainScore) as active}
          <div class="block b-sus" class:active></div>
        {/each}
      </div>
    </div>
  </div>

  <div class="t-section">
    <h4 class="t-title">[ PEAK POTENTIAL ]</h4>
    <div class="t-grid">
      <div class="t-box">
        <span class="t-val">{Math.round(minSwingBase)} - {Math.round(cappedSwingBase)}</span>
        <span class="t-sub">SWING DMG</span>
        <span class="delta" class:up={cappedSwingBase > baselineSwing} class:down={cappedSwingBase < baselineSwing}>{delta(cappedSwingBase, baselineSwing)}</span>
      </div>
      <div class="t-box">
        <span class="t-val">{Math.round(maxPowerSlam)}</span>
        <span class="t-sub">POWER SLAM</span>
        <span class="delta" class:up={maxPowerSlam > baselineSlam}>{delta(maxPowerSlam, baselineSlam)}</span>
      </div>
      <div class="t-box">
        <span class="t-val">{Math.round(maxLaunchSpeed)}</span>
        <span class="t-sub">UPDRAFT SPD</span>
        <span class="delta" class:up={maxLaunchSpeed > baseline.config.blade.launchPower}>{delta(maxLaunchSpeed, baseline.config.blade.launchPower)}</span>
      </div>
      <div class="t-box">
        <span class="t-val">{c.blade.deflectDmgMult.toFixed(2)}X</span>
        <span class="t-sub">DEFLECT MULT</span>
        <span class="delta" class:up={c.blade.deflectDmgMult > baseline.config.blade.deflectDmgMult}>{delta(c.blade.deflectDmgMult, baseline.config.blade.deflectDmgMult, '×')}</span>
      </div>
      <div class="t-box">
        <span class="t-val">{Math.round(throwDmg)}</span>
        <span class="t-sub">THROW DMG</span>
        <span class="delta" class:up={throwDmg > baselineThrow}>{delta(throwDmg, baselineThrow)}</span>
      </div>
      <div class="t-box">
        <span class="t-val">{c.trick.decay.toFixed(2)} /s</span>
        <span class="t-sub">STYLE DECAY</span>
        <span class="delta" class:down={c.trick.decay < baseline.config.trick.decay}>{delta(c.trick.decay, baseline.config.trick.decay, '/s')}</span>
      </div>
    </div>
  </div>

  <div class="t-section">
    <h4 class="t-title">[ KINEMATICS ]</h4>
    <table class="t-table">
      <tbody>
        <tr><td>SPRINT_SPD</td><td class="num">{c.player.moveSpeed.toFixed(0)}</td></tr>
        <tr><td>JUMP_SPD</td><td class="num">{c.player.jumpSpeed.toFixed(0)}</td></tr>
        <tr><td>AIR_ACCEL</td><td class="num">{c.player.airAccel.toFixed(2)}</td></tr>
        <tr><td>DASH_BURST</td><td class="num">{c.dash.speed.toFixed(0)}</td></tr>
        <tr><td>DASH_IFRAME</td><td class="num">{c.dash.iframe.toFixed(2)}s</td></tr>
        <tr><td>THROW_MAX</td><td class="num">{cappedThrowSpeed.toFixed(0)}</td></tr>
        <tr><td>RECALL_SPD</td><td class="num">{c.blade.throw.returnSpeed.toFixed(0)}</td></tr>
        <tr><td>TETHER_LEN</td><td class="num">{c.blade.maxReach.toFixed(0)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="t-section">
    <h4 class="t-title">[ SURVIVAL & MODS ]</h4>
    <table class="t-table">
      <tbody>
        <tr><td>MAX_HP</td><td class="num" class:pos={p.maxHp > 100}>{p.maxHp}</td></tr>
        <tr><td>MAX_SHIELDS</td><td class="num" class:pos={p.maxShield > 0}>{p.maxShield}</td></tr>
        <tr><td>LIFESTEAL</td><td class="num" class:pos={m.lifesteal > 0}>+{m.lifesteal}</td></tr>
        <tr><td>TRICK_REGEN</td><td class="num" class:pos={m.flowRegen}>{m.flowRegen ? 'ACTIVE' : 'NONE'}</td></tr>
        <tr><td>AERIAL_BONUS</td><td class="num" class:pos={m.airBonus > 0}>+{Math.round(m.airBonus * 100)}%</td></tr>
        <tr><td>PARRY_SLOW</td><td class="num">{c.juice.parrySlowScale.toFixed(2)}X</td></tr>
        <tr><td>DASH_CHARGE</td><td class="num" class:pos={p.maxDashCharges > 1}>{p.maxDashCharges}</td></tr>
        <tr><td>DMG_TAKEN</td><td class="num" class:neg={c.player.dmgTakenMult > 1} class:pos={c.player.dmgTakenMult < 1}>{c.player.dmgTakenMult.toFixed(2)}X</td></tr>
        <tr><td>SCORE_MULT</td><td class="num" class:pos={c.run.scoreMult > 1}>{c.run.scoreMult.toFixed(2)}X</td></tr>
        <tr><td>COIN_MULT</td><td class="num" class:pos={c.run.coinMult > 1}>{c.run.coinMult.toFixed(2)}X</td></tr>
      </tbody>
    </table>
  </div>

  <div class="t-section">
    <h4 class="t-title">[ STYLE METER ]</h4>
    <div class="style-meter">
      {#each c.trick.tiers.slice(1) as tier, i}
        <div class="style-tier">
          <span class="style-pts">{tier.at}</span>
          <span class="style-name tier-{i}">{tier.name}</span>
          <span class="style-mult">{tier.mult}x</span>
        </div>
      {/each}
    </div>
  </div>

  <SynergyPanel />
</div>

<style>
  .telemetry {
    font-family: monospace;
    color: var(--sl-color-white);
    text-transform: uppercase;
  }
  .build-identity { border: 1px solid var(--sl-color-hairline); border-left: 4px solid #13c4d6; margin-bottom: 16px; padding: 12px; }
  .identity-label { color: var(--sl-color-gray-3); display: block; font-size: .65rem; font-weight: 800; letter-spacing: .12em; }
  .identity-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .identity-tags span { border: 1px solid #13c4d6; color: #13c4d6; font-size: .62rem; font-weight: 800; letter-spacing: .06em; padding: 3px 5px; }
  .build-identity p { color: var(--sl-color-gray-3); font-size: .68rem; line-height: 1.4; margin: 9px 0 0; text-transform: none; }

  .radar-header {
    background: var(--sl-color-gray-6);
    border: 1px solid var(--sl-color-hairline);
    padding: 16px;
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-radius: 8px;
  }

  .radar-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .label { width: 32px; font-weight: bold; color: var(--sl-color-gray-3); font-size: 0.9rem; }
  
  .block-meter {
    flex: 1;
    display: flex;
    gap: 2px;
  }
  .block {
    flex: 1;
    height: 14px;
    background: var(--sl-color-black);
    border-radius: 2px;
  }
  .b-agl.active { background: #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.5); }
  .b-lth.active { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
  .b-ctl.active { background: #a855f7; box-shadow: 0 0 8px rgba(168, 85, 247, 0.5); }
  .b-sus.active { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }

  .t-section {
    margin-bottom: 24px;
  }
  .t-title {
    font-size: 1rem;
    color: var(--sl-color-gray-3);
    margin: 0 0 12px 0;
    letter-spacing: 2px;
  }

  .t-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  @media (min-width: 400px) {
    .t-grid { grid-template-columns: 1fr 1fr 1fr; }
  }
  
  .t-box {
    border: 1px solid var(--sl-color-hairline);
    padding: 12px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: var(--sl-color-black);
    border-radius: 6px;
  }
  .t-val { font-size: 1rem; font-weight: bold; color: var(--sl-color-white); text-align: center; }
  .t-sub { font-size: 0.65rem; color: var(--sl-color-gray-3); text-align: center; }
  .delta { color: var(--sl-color-gray-3); font-size: .6rem; font-weight: 800; letter-spacing: .05em; margin-top: 2px; } .delta.up { color: #1faf5a; } .delta.down { color: #13c4d6; }

  .t-table {
    width: 100%;
    border-collapse: collapse;
  }
  .t-table td {
    padding: 8px 0;
    border-bottom: 1px dashed var(--sl-color-hairline);
    font-size: 0.85rem;
    color: var(--sl-color-gray-2);
  }
  .t-table .num {
    text-align: right;
    color: var(--sl-color-white);
    font-weight: bold;
  }
  .pos { color: #10b981 !important; text-shadow: 0 0 6px rgba(16, 185, 129, 0.3); }
  .neg { color: #ef4444 !important; text-shadow: 0 0 6px rgba(239, 68, 68, 0.3); }

  /* STYLE METER */
  .style-meter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--sl-color-black);
    padding: 12px;
    border: 1px solid var(--sl-color-hairline);
    border-radius: 6px;
  }
  .style-tier {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid var(--sl-color-gray-6);
  }
  .style-tier:last-child { border-bottom: none; }
  .style-pts { font-size: 0.8rem; color: var(--sl-color-gray-3); width: 40px; }
  .style-name { font-weight: bold; flex: 1; letter-spacing: 1px; }
  .style-mult { color: #f59e0b; font-weight: bold; }
  
  .tier-0 { color: #10b981; } /* NICE */
  .tier-1 { color: #3b82f6; } /* STYLISH */
  .tier-2 { color: #a855f7; } /* BRUTAL */
  .tier-3 { color: #ef4444; } /* SAVAGE */
  .tier-4 { color: #ef8a17; text-shadow: 0 0 6px rgba(239, 138, 23, 0.5); } /* TEARING */
</style>
