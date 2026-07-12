<script>
  import { selectedAbilities } from '../../stores/loadout.js';
  import { simulate, BASE_CONFIG } from '../../lib/simulate.js';
  import SynergyPanel from './SynergyPanel.svelte';

  $: sim = simulate($selectedAbilities);
  $: c = sim.config;
  $: m = sim.mods;
  $: p = sim.player;

  // 1. Calculate Theoretical Max Damage (Perfect Hit)
  // Max Swing Speed allowed by config
  $: maxSwingVelocity = c.blade.maxSpeed;
  $: rawSwingBase = (maxSwingVelocity - c.blade.minHitSpeed) * c.blade.damageScale;
  $: cappedSwingBase = Math.min(rawSwingBase, c.blade.maxDamage);
  
  // Power Slam Math
  $: maxPowerSlam = cappedSwingBase 
    * c.blade.slamMultiplier 
    * (1 + c.blade.slamPowerBonus) 
    * (1 + m.airBonus) 
    * (1 + m.aerialRave)
    * (m.stormMult || 1) // max trick
    * (m.sunderHit ? 1.3 : 1) // Sunder mark
    * (c.player.dmgTakenMult > 1 ? 1.3 : 1); // Glass cannon is applied to dmgTakenMult or damageScale? Wait, Glass cannon applies to damageScale. We already used it via damageScale.
    
  // Updraft Launch Power (Knockback)
  $: maxLaunchSpeed = c.blade.launchPower * (1 + c.blade.risingLaunchBonus);

  // Throw Kinematics
  $: throwReleaseMax = c.blade.throw.speed + (c.blade.throw.speedFromSwing * c.blade.maxSpeed);
  $: cappedThrowSpeed = Math.min(throwReleaseMax, c.blade.throw.maxSpeed);
  $: maxThrowDmg = (c.blade.throw.damage + (cappedThrowSpeed * c.blade.throw.damageFromSpeed)) * c.blade.throw.hiMult;

  // 2. Archetype Profiling (0 - 100 scales relative to base)
  function calcScore(current, base, maxFactor = 2) {
    let ratio = current / base;
    if (ratio < 1) ratio = 1 - ((1 - ratio) / 2); // dimish penalties slightly
    return Math.min(100, Math.max(0, (ratio / maxFactor) * 100));
  }

  // Agility: Move speed, dash distance, dash charges
  $: agilityScore = calcScore(c.player.moveSpeed * p.maxDashCharges, BASE_CONFIG.player.moveSpeed * 1, 3.5);
  // Lethality: Damage scale, air bonuses, max damage
  $: lethalityScore = calcScore(cappedSwingBase * (1 + m.airBonus), (BASE_CONFIG.blade.maxSpeed - BASE_CONFIG.blade.minHitSpeed) * BASE_CONFIG.blade.damageScale, 2.5);
  // Control: Knockback, Stuns, Sling length
  $: controlScore = Math.min(100, 40 + (m.cinderSlow ? 15 : 0) + (m.razorStun || m.concStun || m.parryStun ? 25 : 0) + (m.sunderHit ? 20 : 0));
  // Sustain: Lifesteal, Wave heal, Defenses
  $: sustainScore = Math.min(100, 20 + (m.lifesteal * 15) + (m.bloodrite ? 20 : 0) + (p.maxShield * 15) + (m.parryGuard ? 15 : 0));

</script>

<div class="dashboard-wrapper">
  
  <header class="dash-header">
    <h2>Theorycrafting Engine</h2>
    <div class="archetype-radar">
      <div class="bar-group">
        <label>Agility</label>
        <div class="bar-track"><div class="bar-fill" style="width: {agilityScore}%; background: #3b82f6;"></div></div>
      </div>
      <div class="bar-group">
        <label>Lethality</label>
        <div class="bar-track"><div class="bar-fill" style="width: {lethalityScore}%; background: #ef4444;"></div></div>
      </div>
      <div class="bar-group">
        <label>Control</label>
        <div class="bar-track"><div class="bar-fill" style="width: {controlScore}%; background: #a855f7;"></div></div>
      </div>
      <div class="bar-group">
        <label>Sustain</label>
        <div class="bar-track"><div class="bar-fill" style="width: {sustainScore}%; background: #10b981;"></div></div>
      </div>
    </div>
  </header>

  <div class="metrics-grid">
    <!-- Peak Potential -->
    <div class="metric-card highlight-card">
      <div class="icon-title">
        <span class="ico">⚔️</span>
        <h4>Perfect Swing</h4>
      </div>
      <div class="big-num">{cappedSwingBase.toFixed(0)} <span class="unit">dmg</span></div>
      <p class="desc">Absolute max damage on a flat ground swing hitting {c.blade.maxSpeed} px/s.</p>
    </div>

    <div class="metric-card highlight-card">
      <div class="icon-title">
        <span class="ico">☄️</span>
        <h4>Power Slam Max</h4>
      </div>
      <div class="big-num">{maxPowerSlam.toFixed(0)} <span class="unit">dmg</span></div>
      <p class="desc">Perfect downward slam on a marked target at max trick tier.</p>
    </div>

    <div class="metric-card highlight-card">
      <div class="icon-title">
        <span class="ico">🌪️</span>
        <h4>Updraft Force</h4>
      </div>
      <div class="big-num">{maxLaunchSpeed.toFixed(0)} <span class="unit">px/s</span></div>
      <p class="desc">Upward knockback velocity when hitting a rising launch swing.</p>
    </div>

    <!-- Kinematics -->
    <div class="metric-card physics-card">
      <h4>Kinematics</h4>
      <div class="phys-row">
        <span>Sprint Speed</span>
        <strong>{c.player.moveSpeed.toFixed(0)} px/s</strong>
      </div>
      <div class="phys-row">
        <span>Dash Burst</span>
        <strong>{c.dash.speed.toFixed(0)} px/s</strong>
      </div>
      <div class="phys-row">
        <span>Throw Speed</span>
        <strong>{cappedThrowSpeed.toFixed(0)} px/s</strong>
      </div>
      <div class="phys-row">
        <span>Return Speed</span>
        <strong>{c.blade.throw.returnSpeed.toFixed(0)} px/s</strong>
      </div>
      <div class="phys-row">
        <span>Tether Max</span>
        <strong>{c.blade.maxReach.toFixed(0)} px</strong>
      </div>
    </div>

    <!-- Modifiers & Procs -->
    <div class="metric-card physics-card">
      <h4>Combat Modifiers</h4>
      <div class="phys-row">
        <span>Aerial Bonus</span>
        <strong class:buff={m.airBonus > 0}>+{Math.round(m.airBonus * 100)}%</strong>
      </div>
      <div class="phys-row">
        <span>Parry Slowmo</span>
        <strong>{c.parrySlowScale.toFixed(2)}x time</strong>
      </div>
      <div class="phys-row">
        <span>Lifesteal</span>
        <strong class:buff={m.lifesteal > 0}>+{m.lifesteal} HP/swing</strong>
      </div>
      <div class="phys-row">
        <span>Dash Charges</span>
        <strong class:buff={p.maxDashCharges > 1}>{p.maxDashCharges}</strong>
      </div>
      <div class="phys-row">
        <span>Damage Taken</span>
        <strong class:nerf={c.player.dmgTakenMult > 1} class:buff={c.player.dmgTakenMult < 1}>x{c.player.dmgTakenMult.toFixed(2)}</strong>
      </div>
    </div>
  </div>

  <SynergyPanel />
</div>

<style>
  .dashboard-wrapper {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: var(--sl-color-black);
    padding: 24px;
    border-radius: 12px;
    border: 1px solid var(--sl-color-hairline);
  }

  .dash-header h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: var(--sl-color-white);
    font-size: 1.5rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .archetype-radar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 24px;
  }
  @media (max-width: 768px) {
    .archetype-radar { grid-template-columns: 1fr; }
  }

  .bar-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: bold;
    color: var(--sl-color-gray-2);
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .bar-track {
    width: 100%;
    height: 8px;
    background: var(--sl-color-gray-5);
    border-radius: 4px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .metric-card {
    background: var(--sl-color-gray-6);
    border: 1px solid var(--sl-color-hairline);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
  }

  .highlight-card {
    background: linear-gradient(145deg, var(--sl-color-gray-6), var(--sl-color-black));
    border-color: var(--sl-color-gray-4);
  }

  .icon-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .icon-title h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--sl-color-white);
    text-transform: uppercase;
  }
  .ico { font-size: 1.2rem; }

  .big-num {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--sl-color-white);
    line-height: 1;
    margin-bottom: 8px;
  }
  .unit {
    font-size: 1rem;
    font-weight: normal;
    color: var(--sl-color-gray-3);
  }

  .desc {
    font-size: 0.85rem;
    color: var(--sl-color-gray-3);
    margin: 0;
    line-height: 1.4;
    margin-top: auto;
  }

  .physics-card h4 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 1rem;
    color: var(--sl-color-white);
    text-transform: uppercase;
    border-bottom: 1px solid var(--sl-color-hairline);
    padding-bottom: 8px;
  }
  .phys-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed var(--sl-color-hairline);
    font-size: 0.9rem;
  }
  .phys-row:last-child {
    border-bottom: none;
  }
  .phys-row span { color: var(--sl-color-gray-3); }
  .phys-row strong { color: var(--sl-color-white); font-family: monospace; }
  .buff { color: #10b981 !important; }
  .nerf { color: #ef4444 !important; }

</style>
