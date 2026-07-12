<script>
  import { SPECIALS, UNIQUES, STACKABLES } from '../../data/abilities.js';
  import { loadout } from '../../stores/loadout.js';
  import StatPanel from './StatPanel.svelte';
  import { onMount } from 'svelte';
  import { encodeLoadout, decodeLoadout } from '../../lib/urlEncoder.js';

  let searchQuery = '';
  let activeCategory = 'All';

  // Game categories
  const categories = ['All', 'Offense', 'Resilience', 'Mobility', 'Throw', 'Parry', 'Utility', 'Style'];

  function toggleUnique(id) {
    loadout.update(l => {
      if (l.uniques.includes(id)) {
        l.uniques = l.uniques.filter(x => x !== id);
      } else {
        l.uniques = [...l.uniques, id];
      }
      return l;
    });
  }

  function setSpecialTier(id, tier) {
    loadout.update(l => {
      l.specials[id] = tier;
      return l;
    });
  }

  function adjustStackable(id, delta) {
    loadout.update(l => {
      const current = l.stackables[id] || 0;
      l.stackables[id] = Math.max(0, Math.min(5, current + delta)); // Display cap of 5
      return l;
    });
  }

  function clearLoadout() {
    loadout.set({ specials: {}, uniques: [], stackables: {} });
  }

  function match(u) {
    if (activeCategory !== 'All' && u.cat.toLowerCase() !== activeCategory.toLowerCase()) return false;
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const b = urlParams.get('b');
    if (b) {
      const decoded = decodeLoadout(b);
      if (decoded) {
        loadout.set(decoded);
      }
    }
  });

  let copied = false;
  function shareBuild() {
    const b = encodeLoadout($loadout);
    if (b) {
      const url = new URL(window.location.href);
      url.searchParams.set('b', b);
      navigator.clipboard.writeText(url.toString()).then(() => {
        copied = true;
        setTimeout(() => copied = false, 2000);
      });
    }
  }
</script>

<div class="builder-layout">
  <div class="ability-picker">
    
    <div class="controls">
      <input type="text" placeholder="Search abilities..." bind:value={searchQuery} class="search-box" />
      <button class="share-btn" on:click={shareBuild}>{copied ? 'Copied!' : 'Share URL'}</button>
      <button class="clear-btn" on:click={clearLoadout}>Clear Loadout</button>
    </div>

    <div class="chips">
      {#each categories as cat}
        <button class="chip" class:active={activeCategory === cat} on:click={() => activeCategory = cat}>
          {cat}
        </button>
      {/each}
    </div>

    <!-- SPECIALS -->
    <div class="grid-section">
      <h3>Specials (Tiered)</h3>
      <div class="grid">
        {#each SPECIALS.filter(match) as u}
          <div class="card spec-card cat-{u.cat}">
            <div class="card-head">
              <strong>{u.name}</strong>
            </div>
            <div class="tiers">
              {#each [0, 1, 2, 3] as t}
                <button 
                  class="tier-btn" 
                  class:selected={$loadout.specials[u.id] === t || (t===0 && !$loadout.specials[u.id])} 
                  on:click={() => setSpecialTier(u.id, t)}>
                  T{t}
                </button>
              {/each}
            </div>
            <p class="desc">
              <!-- Show base desc if T0, else show the specific tier desc -->
              {#if $loadout.specials[u.id] > 0 && u.tiers}
                {u.tiers[$loadout.specials[u.id] - 1].desc}
              {:else}
                {u.desc}
              {/if}
            </p>
          </div>
        {/each}
      </div>
    </div>

    <!-- UNIQUES -->
    <div class="grid-section">
      <h3>Uniques (One-time)</h3>
      <div class="grid">
        {#each UNIQUES.filter(match) as u}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div 
            class="card unique-card cat-{u.cat}" 
            class:selected={$loadout.uniques.includes(u.id)}
            on:click={() => toggleUnique(u.id)}>
            <div class="card-head">
              <strong>{u.name}</strong>
            </div>
            <p class="desc">{u.desc}</p>
          </div>
        {/each}
      </div>
    </div>

    <!-- STACKABLES -->
    <div class="grid-section">
      <h3>Stackables (Repeatable)</h3>
      <div class="grid">
        {#each STACKABLES.filter(match) as u}
          <div class="card stack-card cat-{u.cat}" class:active-stack={$loadout.stackables[u.id] > 0}>
            <div class="card-head">
              <strong>{u.name}</strong>
              <div class="counter">
                <button on:click={() => adjustStackable(u.id, -1)}>-</button>
                <span>{$loadout.stackables[u.id] || 0}</span>
                <button on:click={() => adjustStackable(u.id, 1)}>+</button>
              </div>
            </div>
            <p class="desc">{u.desc}</p>
          </div>
        {/each}
      </div>
    </div>

  </div>

  <div class="output-panel">
    <StatPanel />
  </div>
</div>

<style>
  .builder-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 20px;
  }
  @media (min-width: 1024px) {
    .builder-layout {
      grid-template-columns: 2.5fr 1.5fr;
    }
  }

  .controls {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .search-box {
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid var(--sl-color-hairline);
    background: var(--sl-color-gray-6);
    color: var(--sl-color-text);
  }

  .clear-btn, .share-btn {
    padding: 10px 16px;
    background: var(--sl-color-gray-5);
    border: 1px solid var(--sl-color-hairline);
    border-radius: 8px;
    color: var(--sl-color-white);
    cursor: pointer;
  }

  .share-btn {
    background: rgba(19, 196, 214, 0.1);
    border-color: #13c4d6;
    color: #13c4d6;
    font-weight: bold;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 24px;
  }

  .chip {
    padding: 6px 12px;
    border-radius: 20px;
    background: var(--sl-color-gray-6);
    border: 1px solid var(--sl-color-hairline);
    color: var(--sl-color-text);
    cursor: pointer;
    font-size: 0.85rem;
  }
  .chip.active {
    background: var(--sl-color-accent);
    color: var(--sl-color-text-invert);
    border-color: var(--sl-color-accent);
  }

  .grid-section {
    margin-bottom: 40px;
  }
  
  .grid-section h3 {
    margin-bottom: 16px;
    font-size: 1.25rem;
    color: var(--sl-color-white);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .card {
    background: var(--sl-color-gray-6);
    border: 1px solid var(--sl-color-hairline);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: transform 0.1s ease, border-color 0.2s ease;
  }

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-head strong {
    color: var(--sl-color-white);
  }

  .desc {
    font-size: 0.85rem;
    color: var(--sl-color-gray-3);
    margin: 0;
    line-height: 1.4;
  }

  /* Cat borders */
  .cat-offense { border-top: 3px solid #ef4444; }
  .cat-resilience { border-top: 3px solid #10b981; }
  .cat-mobility { border-top: 3px solid #3b82f6; }
  .cat-utility { border-top: 3px solid #a855f7; }
  .cat-throw { border-top: 3px solid #f59e0b; }
  .cat-parry { border-top: 3px solid #13c4d6; }

  /* Unique */
  .unique-card { cursor: pointer; user-select: none; }
  .unique-card.selected {
    border-color: var(--sl-color-accent);
    background: var(--sl-color-gray-5);
  }

  /* Stackable */
  .stack-card.active-stack {
    border-color: var(--sl-color-accent);
  }
  .counter {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--sl-color-black);
    border-radius: 4px;
    padding: 2px;
  }
  .counter button {
    background: transparent;
    border: none;
    color: var(--sl-color-white);
    width: 24px;
    height: 24px;
    cursor: pointer;
    border-radius: 4px;
  }
  .counter button:hover { background: var(--sl-color-gray-4); }
  .counter span { font-weight: bold; width: 16px; text-align: center; }

  /* Specials */
  .tiers {
    display: flex;
    gap: 4px;
    background: var(--sl-color-black);
    padding: 4px;
    border-radius: 6px;
  }
  .tier-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--sl-color-gray-3);
    padding: 4px 0;
    cursor: pointer;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
  }
  .tier-btn.selected {
    background: var(--sl-color-accent);
    color: var(--sl-color-text-invert);
  }

  .output-panel {
    background: var(--sl-color-gray-6);
    border: 1px solid var(--sl-color-hairline);
    border-radius: 8px;
    padding: 20px;
    height: fit-content;
    position: sticky;
    top: 80px;
  }
</style>
