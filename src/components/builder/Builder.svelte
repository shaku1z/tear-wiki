<script>
  import { SPECIALS, UNIQUES, STACKABLES } from '../../data/abilities.js';
  import { loadout } from '../../stores/loadout.js';
  import StatPanel from './StatPanel.svelte';
  import { onMount } from 'svelte';
  import { encodeLoadout, decodeLoadout } from '../../lib/urlEncoder.js';

  let searchQuery = '';
  let activeDomain = 'All';

  const domains = ['All', 'Offense', 'Resilience', 'Mobility', 'Throw', 'Parry', 'Utility', 'Style'];

  // Combine into a single array with types
  const ALL_ABILITIES = [
    ...SPECIALS.map(u => ({ ...u, type: 'special' })),
    ...UNIQUES.map(u => ({ ...u, type: 'unique' })),
    ...STACKABLES.map(u => ({ ...u, type: 'stackable' }))
  ];

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
      l.stackables[id] = Math.max(0, Math.min(5, current + delta));
      return l;
    });
  }

  function clearLoadout() {
    loadout.set({ specials: {}, uniques: [], stackables: {} });
  }

  function getAbilitiesForDomain(domain) {
    return ALL_ABILITIES.filter(u => {
      if (domain !== 'All' && u.cat.toLowerCase() !== domain.toLowerCase()) return false;
      if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const b = urlParams.get('b');
    if (b) {
      const decoded = decodeLoadout(b);
      if (decoded) loadout.set(decoded);
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

  // Mobile drawer state
  let drawerOpen = false;
</script>

<div class="workbench">
  
  <!-- LEFT: Sidebar (Filters) -->
  <aside class="sidebar">
    <div class="sticky-top">
      <h3 class="panel-title">Workbench</h3>
      
      <div class="controls">
        <input type="text" placeholder="Search..." bind:value={searchQuery} class="search-box" />
        <div class="btn-group">
          <button class="brutalist-btn" on:click={clearLoadout}>Clear</button>
          <button class="brutalist-btn share" on:click={shareBuild}>{copied ? 'Copied' : 'Share'}</button>
        </div>
      </div>

      <nav class="domain-nav">
        {#each domains as dom}
          <button class="nav-tab" class:active={activeDomain === dom} on:click={() => { activeDomain = dom; window.scrollTo({top: 0}); }}>
            <span class="dot cat-{dom.toLowerCase()}"></span>
            {dom}
          </button>
        {/each}
      </nav>
    </div>
  </aside>

  <!-- CENTER: Ability Canvas -->
  <main class="canvas">
    {#each (activeDomain === 'All' ? domains.slice(1) : [activeDomain]) as currentDomain}
      {@const domainAbilities = getAbilitiesForDomain(currentDomain)}
      
      {#if domainAbilities.length > 0}
        <section class="domain-section">
          <h2 class="domain-header">
            <span class="block cat-{currentDomain.toLowerCase()}"></span>
            {currentDomain} Domain
          </h2>
          
          <div class="grid">
            {#each domainAbilities as u}
              
              <!-- SPECIAL -->
              {#if u.type === 'special'}
                <div class="card spec-card cat-{u.cat}">
                  <div class="card-head">
                    <strong>{u.name}</strong>
                    <span class="tag">Special</span>
                  </div>
                  <div class="mech-switch-group">
                    {#each [0, 1, 2, 3] as t}
                      <button 
                        class="mech-switch" 
                        class:on={$loadout.specials[u.id] === t || (t===0 && !$loadout.specials[u.id])} 
                        on:click={() => setSpecialTier(u.id, t)}>
                        T{t}
                      </button>
                    {/each}
                  </div>
                  <p class="desc">
                    {#if $loadout.specials[u.id] > 0 && u.tiers}
                      {u.tiers[$loadout.specials[u.id] - 1].desc}
                    {:else}
                      {u.desc}
                    {/if}
                  </p>
                </div>

              <!-- UNIQUE -->
              {:else if u.type === 'unique'}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div 
                  class="card unique-card cat-{u.cat}" 
                  class:selected={$loadout.uniques.includes(u.id)}
                  on:click={() => toggleUnique(u.id)}>
                  <div class="card-head">
                    <strong>{u.name}</strong>
                    <div class="checkbox-indicator"></div>
                  </div>
                  <p class="desc">{u.desc}</p>
                </div>

              <!-- STACKABLE -->
              {:else}
                <div class="card stack-card cat-{u.cat}" class:selected={$loadout.stackables[u.id] > 0}>
                  <div class="card-head">
                    <strong>{u.name}</strong>
                    <div class="mech-counter">
                      <button on:click={() => adjustStackable(u.id, -1)}>&minus;</button>
                      <span>{$loadout.stackables[u.id] || 0}</span>
                      <button on:click={() => adjustStackable(u.id, 1)}>&plus;</button>
                    </div>
                  </div>
                  <p class="desc">{u.desc}</p>
                </div>
              {/if}

            {/each}
          </div>
        </section>
      {/if}
    {/each}
    <div class="mobile-spacer"></div>
  </main>

  <!-- RIGHT (Desktop) / BOTTOM (Mobile): Telemetry Dashboard -->
  <aside class="dashboard-container" class:drawer-open={drawerOpen}>
    <button class="mobile-drawer-toggle" on:click={() => drawerOpen = !drawerOpen}>
      <div class="pull-pill"></div>
      <span class="readout">Telemetry {drawerOpen ? 'Close' : 'Open'}</span>
    </button>
    <div class="dashboard-scroll">
      <StatPanel />
    </div>
  </aside>

</div>

<style>
  /* --- LAYOUT ARCHITECTURE --- */
  .workbench {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    margin-top: 20px;
    align-items: start;
    position: relative;
  }
  
  @media (min-width: 1024px) {
    .workbench {
      grid-template-columns: 240px 1fr 340px;
      gap: 32px;
    }
    .mobile-spacer { display: none; }
    .mobile-drawer-toggle { display: none; }
  }

  /* --- SIDEBAR FILTERS --- */
  .sidebar { display: none; }
  @media (min-width: 1024px) { .sidebar { display: block; } }

  .sticky-top {
    position: sticky;
    top: 80px;
  }

  .panel-title {
    font-family: monospace;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-size: 0.9rem;
    color: var(--sl-color-gray-3);
    margin-bottom: 24px;
    border-bottom: 1px solid var(--sl-color-hairline);
    padding-bottom: 8px;
  }

  .controls { margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px; }
  .search-box {
    width: 100%;
    padding: 12px;
    background: var(--sl-color-black);
    border: 1px solid var(--sl-color-hairline);
    border-radius: 0; /* Brutalist sharp corners */
    color: var(--sl-color-white);
    font-family: monospace;
  }
  .search-box:focus { outline: 1px solid var(--sl-color-accent); border-color: var(--sl-color-accent); }

  .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .brutalist-btn {
    padding: 12px 0;
    background: var(--sl-color-gray-6);
    border: 1px solid var(--sl-color-hairline);
    color: var(--sl-color-white);
    font-family: monospace;
    text-transform: uppercase;
    cursor: pointer;
    transition: transform 0.1s, background 0.1s;
    touch-action: manipulation;
  }
  .brutalist-btn:active { transform: scale(0.96); background: var(--sl-color-gray-5); }
  .share { border-color: #13c4d6; color: #13c4d6; background: rgba(19, 196, 214, 0.05); }

  .domain-nav { display: flex; flex-direction: column; gap: 4px; }
  .nav-tab {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 12px 16px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--sl-color-gray-2);
    font-family: monospace;
    font-size: 0.9rem;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.1s;
  }
  .nav-tab:hover { background: var(--sl-color-gray-6); }
  .nav-tab.active {
    background: var(--sl-color-black);
    border: 1px solid var(--sl-color-hairline);
    color: var(--sl-color-white);
    font-weight: bold;
  }
  .dot { width: 8px; height: 8px; display: inline-block; }

  /* --- CANVAS & GRID --- */
  .canvas { width: 100%; }
  
  .domain-section { margin-bottom: 48px; }
  .domain-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.5rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 24px;
    color: var(--sl-color-white);
    border-bottom: 1px solid var(--sl-color-hairline);
    padding-bottom: 8px;
  }
  .block { width: 12px; height: 24px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  /* --- BRUTALIST TACTILE CARDS --- */
  .card {
    background: var(--sl-color-black);
    border: 1px solid var(--sl-color-hairline);
    border-left-width: 6px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 4px 4px 0 rgba(0,0,0,0.2);
    transition: transform 0.1s, box-shadow 0.1s, border-color 0.2s;
  }

  .card-head { display: flex; justify-content: space-between; align-items: flex-start; }
  .card-head strong { font-size: 1.1rem; color: var(--sl-color-white); line-height: 1.2; }
  .tag { font-family: monospace; font-size: 0.7rem; color: var(--sl-color-gray-3); text-transform: uppercase; border: 1px solid var(--sl-color-gray-4); padding: 2px 6px; }

  .desc { font-size: 0.85rem; color: var(--sl-color-gray-2); margin: 0; line-height: 1.5; margin-top: auto; }

  /* Cat Colors */
  .cat-offense { border-left-color: #ef4444; background-color: #ef4444; }
  .cat-resilience { border-left-color: #10b981; background-color: #10b981; }
  .cat-mobility { border-left-color: #3b82f6; background-color: #3b82f6; }
  .cat-utility { border-left-color: #a855f7; background-color: #a855f7; }
  .cat-throw { border-left-color: #f59e0b; background-color: #f59e0b; }
  .cat-parry { border-left-color: #13c4d6; background-color: #13c4d6; }
  .cat-all { border-left-color: var(--sl-color-white); background-color: var(--sl-color-white); }

  /* UNIQUE TOGGLE */
  .unique-card { cursor: pointer; user-select: none; touch-action: manipulation; }
  .unique-card:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 rgba(0,0,0,0.2); }
  .unique-card.selected { background: var(--sl-color-gray-6); border-color: var(--sl-color-white); }
  .checkbox-indicator { width: 20px; height: 20px; border: 2px solid var(--sl-color-gray-4); border-radius: 2px; }
  .unique-card.selected .checkbox-indicator { background: var(--sl-color-white); border-color: var(--sl-color-white); }

  /* MECHANICAL SWITCHES (Specials) */
  .mech-switch-group { display: flex; gap: 8px; background: var(--sl-color-gray-6); padding: 6px; border: 1px solid var(--sl-color-hairline); }
  .mech-switch {
    flex: 1;
    padding: 8px 0;
    font-family: monospace;
    font-size: 0.9rem;
    font-weight: bold;
    color: var(--sl-color-gray-3);
    background: var(--sl-color-black);
    border: 1px solid var(--sl-color-hairline);
    cursor: pointer;
    touch-action: manipulation;
    transition: transform 0.05s, box-shadow 0.05s, background 0.1s;
    box-shadow: 0 2px 0 rgba(0,0,0,0.5); /* Raised */
  }
  .mech-switch:active { transform: translateY(2px); box-shadow: 0 0 0 rgba(0,0,0,0); /* Depressed */ }
  .mech-switch.on { background: var(--sl-color-white); color: var(--sl-color-black); border-color: var(--sl-color-white); box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); transform: translateY(2px); }

  /* MECHANICAL COUNTER (Stackables) */
  .stack-card.selected { background: var(--sl-color-gray-6); }
  .mech-counter { display: flex; align-items: center; border: 1px solid var(--sl-color-hairline); background: var(--sl-color-black); }
  .mech-counter button {
    width: 36px; height: 36px;
    background: transparent; border: none;
    color: var(--sl-color-white); font-size: 1.2rem; cursor: pointer; touch-action: manipulation;
    transition: background 0.1s;
  }
  .mech-counter button:active { background: var(--sl-color-gray-5); }
  .mech-counter span { font-family: monospace; font-size: 1.1rem; width: 32px; text-align: center; font-weight: bold; border-left: 1px solid var(--sl-color-hairline); border-right: 1px solid var(--sl-color-hairline); }

  /* --- TELEMETRY DASHBOARD (RIGHT / BOTTOM) --- */
  .dashboard-container {
    background: var(--sl-color-black);
    border-left: 1px solid var(--sl-color-hairline);
    height: calc(100vh - 60px);
    position: sticky;
    top: 60px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .dashboard-scroll {
    overflow-y: auto;
    padding: 24px;
    height: 100%;
  }

  /* MOBILE BOTTOM SHEET */
  @media (max-width: 1023px) {
    .mobile-spacer { height: 100px; }
    
    .dashboard-container {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 70vh;
      z-index: 100;
      border-left: none;
      border-top: 2px solid var(--sl-color-hairline);
      box-shadow: 0 -10px 30px rgba(0,0,0,0.5);
      transform: translateY(calc(100% - 64px));
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .dashboard-container.drawer-open {
      transform: translateY(0);
    }

    .mobile-drawer-toggle {
      width: 100%;
      height: 64px;
      background: var(--sl-color-gray-6);
      border: none;
      border-bottom: 1px solid var(--sl-color-hairline);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }

    .pull-pill { width: 40px; height: 4px; background: var(--sl-color-gray-3); border-radius: 2px; }
    .readout { font-family: monospace; text-transform: uppercase; font-size: 0.8rem; color: var(--sl-color-white); letter-spacing: 2px; }
  }
</style>
