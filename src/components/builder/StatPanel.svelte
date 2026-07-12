<script>
  import { selectedAbilities } from '../../stores/loadout.js';
  import { simulate, BASE_CONFIG } from '../../lib/simulate.js';
  import SynergyPanel from './SynergyPanel.svelte';

  $: sim = simulate($selectedAbilities);
  $: c = sim.config;
  $: m = sim.mods;
  $: p = sim.player;

  $: maxSwingVelocity = c.blade.maxSpeed;
  $: rawSwingBase = (maxSwingVelocity - c.blade.minHitSpeed) * c.blade.damageScale;
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

  function calcScore(current, base, maxFactor = 2) {
    let ratio = current / base;
    if (ratio < 1) ratio = 1 - ((1 - ratio) / 2);
    return Math.min(100, Math.max(0, (ratio / maxFactor) * 100));
  }

  $: agilityScore = calcScore(c.player.moveSpeed * p.maxDashCharges, BASE_CONFIG.player.moveSpeed * 1, 3.5);
  $: lethalityScore = calcScore(cappedSwingBase * (1 + m.airBonus), (BASE_CONFIG.blade.maxSpeed - BASE_CONFIG.blade.minHitSpeed) * BASE_CONFIG.blade.damageScale, 2.5);
  $: controlScore = Math.min(100, 40 + (m.cinderSlow ? 15 : 0) + (m.razorStun || m.concStun || m.parryStun ? 25 : 0) + (m.sunderHit ? 20 : 0));
  $: sustainScore = Math.min(100, 20 + (m.lifesteal * 15) + (m.bloodrite ? 20 : 0) + (p.maxShield * 15) + (m.parryGuard ? 15 : 0));

  function getBlocks(score) {
    const totalBlocks = 10;
    const activeBlocks = Math.floor((score / 100) * totalBlocks);
    return Array(totalBlocks).fill(0).map((_, i) => i < activeBlocks);
  }
</script>

<div class="telemetry">
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
        <span class="t-val">{cappedSwingBase.toFixed(0)}</span>
        <span class="t-sub">MAX SWING DMG</span>
      </div>
      <div class="t-box">
        <span class="t-val">{maxPowerSlam.toFixed(0)}</span>
        <span class="t-sub">POWER SLAM</span>
      </div>
      <div class="t-box">
        <span class="t-val">{maxLaunchSpeed.toFixed(0)}</span>
        <span class="t-sub">UPDRAFT SPD</span>
      </div>
    </div>
  </div>

  <div class="t-section">
    <h4 class="t-title">[ KINEMATICS ]</h4>
    <table class="t-table">
      <tbody>
        <tr><td>SPRINT_SPD</td><td class="num">{c.player.moveSpeed.toFixed(0)}</td></tr>
        <tr><td>DASH_BURST</td><td class="num">{c.dash.speed.toFixed(0)}</td></tr>
        <tr><td>THROW_MAX</td><td class="num">{cappedThrowSpeed.toFixed(0)}</td></tr>
        <tr><td>RECALL_SPD</td><td class="num">{c.blade.throw.returnSpeed.toFixed(0)}</td></tr>
        <tr><td>TETHER_LEN</td><td class="num">{c.blade.maxReach.toFixed(0)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="t-section">
    <h4 class="t-title">[ MODIFIERS ]</h4>
    <table class="t-table">
      <tbody>
        <tr><td>AERIAL_BONUS</td><td class="num" class:pos={m.airBonus > 0}>+{Math.round(m.airBonus * 100)}%</td></tr>
        <tr><td>PARRY_SLOW</td><td class="num">{c.juice.parrySlowScale.toFixed(2)}X</td></tr>
        <tr><td>LIFESTEAL</td><td class="num" class:pos={m.lifesteal > 0}>+{m.lifesteal}</td></tr>
        <tr><td>DASH_CHARGE</td><td class="num" class:pos={p.maxDashCharges > 1}>{p.maxDashCharges}</td></tr>
        <tr><td>DMG_TAKEN</td><td class="num" class:neg={c.player.dmgTakenMult > 1} class:pos={c.player.dmgTakenMult < 1}>{c.player.dmgTakenMult.toFixed(2)}X</td></tr>
      </tbody>
    </table>
  </div>

  <SynergyPanel />
</div>

<style>
  .telemetry {
    font-family: monospace;
    color: var(--sl-color-white);
    text-transform: uppercase;
  }

  .radar-header {
    background: var(--sl-color-gray-6);
    border: 1px solid var(--sl-color-hairline);
    padding: 16px;
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
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
  }
  .b-agl.active { background: #3b82f6; }
  .b-lth.active { background: #ef4444; }
  .b-ctl.active { background: #a855f7; }
  .b-sus.active { background: #10b981; }

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
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .t-box {
    border: 1px solid var(--sl-color-hairline);
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: var(--sl-color-black);
  }
  .t-val { font-size: 1.4rem; font-weight: bold; color: var(--sl-color-white); }
  .t-sub { font-size: 0.7rem; color: var(--sl-color-gray-3); text-align: center; }

  .t-table {
    width: 100%;
    border-collapse: collapse;
  }
  .t-table td {
    padding: 8px 0;
    border-bottom: 1px dashed var(--sl-color-hairline);
    font-size: 0.9rem;
    color: var(--sl-color-gray-2);
  }
  .t-table .num {
    text-align: right;
    color: var(--sl-color-white);
    font-weight: bold;
  }
  .pos { color: #10b981 !important; }
  .neg { color: #ef4444 !important; }
</style>
