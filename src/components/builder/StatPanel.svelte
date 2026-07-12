<script>
  import { selectedAbilities } from '../../stores/loadout.js';
  import { simulate, BASE_CONFIG, BASE_MODS } from '../../lib/simulate.js';

  import SynergyPanel from './SynergyPanel.svelte';

  // We want to calculate the step-by-step damage multipliers.
  // Damage scale is affected by CONFIG.blade.damageScale.
  // Other multipliers are added in combat:
  // - AirBonus (mods.airBonus)
  // - AerialRave (mods.aerialRave)
  // - GlassCannon (multiplies damageScale)

  // Reactive simulation of the full loadout
  $: sim = simulate($selectedAbilities);
  
  // Calculate the damage breakdown
  $: damageBreakdown = getDamageBreakdown($selectedAbilities);

  function getDamageBreakdown(abilities) {
    let steps = [];
    let currentDmgScale = BASE_CONFIG.blade.damageScale;
    let base = currentDmgScale;

    // To get the exact step-by-step, we can run a micro-simulation
    let tempSim = simulate([]); // get clean base state
    
    // Group stackables so we show "Keen Edge x2" rather than two lines
    const grouped = [];
    abilities.forEach(a => {
      const existing = grouped.find(g => g.id === a.id && g.tier === a.tier);
      if (existing) existing.count++;
      else grouped.push({ ...a, count: 1 });
    });

    for (const group of grouped) {
      const beforeScale = tempSim.config.blade.damageScale;
      const beforeAir = tempSim.mods.airBonus;
      const beforeRave = tempSim.mods.aerialRave;
      
      // Apply it N times
      for(let i=0; i<group.count; i++) {
        if (group.apply) group.apply(tempSim);
      }

      const afterScale = tempSim.config.blade.damageScale;
      const afterAir = tempSim.mods.airBonus;
      const afterRave = tempSim.mods.aerialRave;

      let desc = '';
      let mult = 1.0;

      if (afterScale !== beforeScale) {
        mult = afterScale / beforeScale;
        desc = `Scale \u00D7${mult.toFixed(3)}`;
      } else if (afterAir !== beforeAir) {
        mult = 1 + (afterAir - beforeAir);
        desc = `Air \u00D7${mult.toFixed(2)}`;
      } else if (afterRave !== beforeRave) {
        mult = 1 + (afterRave - beforeRave);
        desc = `Air Cap \u00D7${mult.toFixed(2)}`;
      }

      if (mult !== 1.0) {
        let name = group.name;
        if (group.tier) name += ` T${group.tier}`;
        if (group.count > 1) name += ` \u00D7${group.count}`;
        steps.push({ name, desc, mult });
      }
    }

    let finalMult = (tempSim.config.blade.damageScale / base) 
                    * (1 + tempSim.mods.airBonus)
                    * (1 + tempSim.mods.aerialRave);

    const hitCap = tempSim.config.blade.damageScale >= BASE_CONFIG.blade.maxDamage * 2; // approximation for warning

    return { steps, finalMult, hitCap, maxDamage: tempSim.config.blade.maxDamage };
  }

  // Helpers to extract booleans/values for the UI
  $: m = sim.mods;
  $: c = sim.config;
  
  $: statuses = [
    { name: 'Bleed', active: m.bleedHit > 0 || m.bleedDetonate || m.bleedNova, 
      desc: `${m.bleedHit ? `Applies ${m.bleedHit} stacks on hit.` : ''} ${m.bleedDetonate ? 'Detonates on slam/recall.' : ''}` },
    { name: 'Mark', active: m.sunderHit || m.backlashMark, 
      desc: `${m.sunderHit ? 'Applied on hit (+30% dmg).' : ''} ${m.backlashMark ? 'Applied in AoE on parry.' : ''}` },
    { name: 'Stun', active: m.razorStun || m.concStun || m.parryStun, 
      desc: 'Can stun enemies.' },
    { name: 'Slow', active: m.cinderSlow, 
      desc: 'Cinder trail slows enemies.' }
  ].filter(s => s.active);

  $: sustains = [
    { name: 'Vampiric Edge', active: m.lifesteal > 0, desc: `+${m.lifesteal} HP per swing` },
    { name: 'Bloodrite', active: m.bloodrite, desc: 'Heals on SKILL kill' },
    { name: 'Flow Guard Regen', active: m.flowRegen, desc: 'Passive heal at high trick rank' },
    { name: 'Bulwark', active: m.waveHeal > 0, desc: `+${m.waveHeal} HP per wave clear` }
  ].filter(s => s.active);

  $: defenses = [
    { name: 'Riposte', active: m.parryGuard, desc: 'Invuln/DR after perfect parry' },
    { name: 'Aegis', active: m.aegisParry || sim.player.maxShield > 0, desc: 'Absorbs hits' },
    { name: 'Flow Guard', active: m.flowGuard, desc: 'DR at high trick rank' },
    { name: 'Slipstream', active: m.slipstream, desc: 'Damage window post-dash' }
  ].filter(s => s.active);
</script>

<div class="stat-panel">
  <h2>Stat Output</h2>

  <div class="section math-chain">
    <h4>Damage Multiplier Breakdown</h4>
    <div class="chain">
      <div class="row"><span>Base damage scale:</span> <span>&times;1.00</span></div>
      {#each damageBreakdown.steps as step}
        <div class="row">
          <span class="muted">+ {step.name}:</span> 
          <span class="highlight">{step.desc}</span>
        </div>
      {/each}
      <hr/>
      <div class="row final">
        <span>Final Multiplier:</span> 
        <span class="highlight">&times;{damageBreakdown.finalMult.toFixed(2)}</span>
      </div>
    </div>
    
    {#if damageBreakdown.hitCap}
      <div class="warning">
        <strong>&#9888; maxDamage cap REACHED</strong>
        <p>Additional damage multipliers beyond this point yield zero returns. Current cap: {damageBreakdown.maxDamage}</p>
      </div>
    {/if}
  </div>

  <div class="section">
    <h4>Active Status Effects</h4>
    {#if statuses.length === 0}<p class="muted">None</p>{/if}
    <ul class="clean-list">
      {#each statuses as s}
        <li><strong>{s.name}:</strong> <span class="muted">{s.desc}</span></li>
      {/each}
    </ul>
  </div>

  <div class="section">
    <h4>Sustain Sources</h4>
    {#if sustains.length === 0}<p class="muted">None (Base heal only)</p>{/if}
    <ul class="clean-list">
      {#each sustains as s}
        <li><strong>{s.name}:</strong> <span class="muted">{s.desc}</span></li>
      {/each}
    </ul>
  </div>

  <div class="section">
    <h4>Defensive Windows</h4>
    {#if defenses.length === 0}<p class="muted">None (Base iframe only)</p>{/if}
    <ul class="clean-list">
      {#each defenses as s}
        <li><strong>{s.name}:</strong> <span class="muted">{s.desc}</span></li>
      {/each}
    </ul>
  </div>

  <div class="section">
    <h4>Dash Behavior</h4>
    <ul class="clean-list">
      <li><strong>Charges:</strong> <span class="highlight">{sim.player.maxDashCharges}</span></li>
      <li><strong>Cooldown:</strong> <span class="highlight">{(c.dash.cooldown).toFixed(2)}s</span></li>
      {#if m.phantomRefund || m.concRefund || $selectedAbilities.find(a => a.id === 'adrenaline')}
        <li>
          <strong>Refunds on:</strong> 
          <span class="muted">
            {[
              m.phantomRefund ? 'Phase Slice Kill' : null,
              m.concRefund ? 'Shockwave Hit' : null,
              $selectedAbilities.find(a => a.id === 'adrenaline') ? 'Any Kill' : null
            ].filter(Boolean).join(', ')}
          </span>
        </li>
      {/if}
    </ul>
  </div>

  <SynergyPanel />
</div>

<style>
  .stat-panel h2 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.5rem;
    color: var(--sl-color-white);
  }

  .section {
    margin-bottom: 24px;
  }
  .section h4 {
    margin-bottom: 12px;
    font-size: 1rem;
    color: var(--sl-color-gray-2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--sl-color-hairline);
    padding-bottom: 4px;
  }

  .chain {
    background: var(--sl-color-black);
    padding: 12px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
  }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
  }
  .row.final {
    font-weight: bold;
    font-size: 1rem;
    color: var(--sl-color-white);
  }
  .highlight { color: var(--sl-color-accent); }
  .muted { color: var(--sl-color-gray-3); }

  hr {
    border: none;
    border-top: 1px dashed var(--sl-color-gray-4);
    margin: 8px 0;
  }

  .warning {
    margin-top: 12px;
    padding: 12px;
    background: rgba(239, 68, 68, 0.1);
    border-left: 4px solid #ef4444;
    border-radius: 4px;
  }
  .warning strong { color: #ef4444; display: block; margin-bottom: 4px; }
  .warning p { margin: 0; font-size: 0.85rem; color: var(--sl-color-text); }

  .clean-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .clean-list li {
    padding: 4px 0;
    font-size: 0.9rem;
    color: var(--sl-color-white);
  }
</style>
