<script>
  import synergiesData from '../../data/synergies.json';
  import { loadout, selectedAbilities } from '../../stores/loadout.js';
  import { simulate } from '../../lib/simulate.js';

  // We want to detect synergies and conflicts based on the current loadout.
  // We'll also suggest "one-away" synergies.

  $: sim = simulate($selectedAbilities);
  $: activeSynergies = detectSynergies($loadout, sim, synergiesData);
  $: suggestions = detectSuggestions($loadout, synergiesData);

  function checkRequirements(reqs, loadout) {
    if (!reqs) return true;
    for (const [id, tier] of Object.entries(reqs)) {
      const currentTier = loadout.specials[id] || (loadout.uniques.includes(id) ? 1 : 0) || loadout.stackables[id] || 0;
      if (currentTier < tier) return false;
    }
    return true;
  }

  function detectSynergies(loadout, sim, synergies) {
    const active = [];
    
    for (const syn of synergies) {
      let isMet = false;

      // Handle standard exact requirements
      if (syn.requires && checkRequirements(syn.requires, loadout)) {
        isMet = true;
      }

      // Handle 'requires_any' (like multiple dash refunds)
      if (syn.requires_any) {
        let count = 0;
        if (syn.requires_any.includes('adrenaline') && loadout.uniques.includes('adrenaline')) count++;
        if (syn.requires_any.includes('phantom_dash_refund') && sim.mods.phantomRefund) count++;
        if (syn.requires_any.includes('concussive_dash_refund') && sim.mods.concRefund) count++;
        
        if (count >= (syn.min_count || 2)) isMet = true;
      }

      if (isMet) active.push(syn);
    }
    return active;
  }

  function detectSuggestions(loadout, synergies) {
    const suggestionsList = [];

    for (const syn of synergies) {
      if (syn.type !== 'positive' || !syn.requires) continue;

      let missing = [];
      let present = [];

      for (const [id, tier] of Object.entries(syn.requires)) {
        const currentTier = loadout.specials[id] || (loadout.uniques.includes(id) ? 1 : 0) || loadout.stackables[id] || 0;
        if (currentTier < tier) {
          missing.push({ id, tier });
        } else {
          present.push({ id, tier });
        }
      }

      // If exactly ONE requirement is missing, suggest it
      if (missing.length === 1 && present.length > 0) {
        suggestionsList.push({
          syn,
          missing: missing[0],
          present: present[0]
        });
      }
    }
    return suggestionsList;
  }

  function formatAbilityName(id, tier) {
    const name = id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return tier > 1 ? `${name} T${tier}` : name;
  }
</script>

<div class="synergy-panel">
  <h4>Synergies & Conflicts</h4>

  {#if activeSynergies.length === 0 && suggestions.length === 0}
    <p class="muted">No active synergies detected.</p>
  {/if}

  {#each activeSynergies as syn}
    <div class="syn-card type-{syn.type}">
      <strong>{syn.label}</strong>
      <p>{syn.description}</p>
    </div>
  {/each}

  {#if suggestions.length > 0}
    <div class="suggestions">
      <h5>Suggestions</h5>
      <ul>
        {#each suggestions as s}
          <li>
            <span class="plus">+</span> Add <strong>{formatAbilityName(s.missing.id, s.missing.tier)}</strong> to activate <em>{s.syn.label}</em> with your current {formatAbilityName(s.present.id, s.present.tier)}.
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .synergy-panel {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px dashed var(--sl-color-hairline);
  }

  h4 {
    margin-bottom: 12px;
    font-size: 1rem;
    color: var(--sl-color-white);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .muted { color: var(--sl-color-gray-3); font-size: 0.9rem; }

  .syn-card {
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    background: var(--sl-color-black);
    border-left: 4px solid transparent;
  }
  .syn-card strong {
    display: block;
    margin-bottom: 4px;
    font-size: 0.95rem;
  }
  .syn-card p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--sl-color-gray-2);
  }

  .type-positive {
    background: rgba(19, 196, 214, 0.1);
    border-left-color: #13c4d6;
  }
  .type-positive strong { color: #13c4d6; }

  .type-conflict {
    background: rgba(245, 158, 11, 0.1);
    border-left-color: #f59e0b;
  }
  .type-conflict strong { color: #f59e0b; }

  .suggestions {
    margin-top: 16px;
  }
  .suggestions h5 {
    color: var(--sl-color-gray-3);
    margin-bottom: 8px;
    font-size: 0.85rem;
    text-transform: uppercase;
  }
  .suggestions ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .suggestions li {
    font-size: 0.85rem;
    color: var(--sl-color-gray-2);
    margin-bottom: 6px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .plus {
    color: #10b981;
    font-weight: bold;
  }
</style>
