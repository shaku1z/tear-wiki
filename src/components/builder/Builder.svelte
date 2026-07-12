<script>
  import { onMount } from 'svelte';
  import { SPECIALS, UNIQUES, STACKABLES } from '../../data/abilities.js';
  import gameManifest from '../../data/game-manifest.json';
  import { loadout } from '../../stores/loadout.js';
  import StatPanel from './StatPanel.svelte';
  import { encodeLoadout, decodeLoadout } from '../../lib/urlEncoder.js';

  let searchQuery = '';
  let activeDomain = 'All';
  let drawerOpen = false;
  let copied = false;

  const domains = ['All', 'Offense', 'Resilience', 'Mobility', 'Throw', 'Parry', 'Utility'];
  const ALL_ABILITIES = [
    ...SPECIALS.map((u) => ({ ...u, type: 'special' })),
    ...UNIQUES.map((u) => ({ ...u, type: 'unique' })),
    ...STACKABLES.map((u) => ({ ...u, type: 'stackable' })),
  ];

  $: visibleAbilities = ALL_ABILITIES.filter((ability) => {
    const matchesDomain = activeDomain === 'All' || ability.cat.toLowerCase() === activeDomain.toLowerCase();
    const search = searchQuery.trim().toLowerCase();
    return matchesDomain && (!search || `${ability.name} ${ability.desc}`.toLowerCase().includes(search));
  });
  $: selectedCount = Object.values($loadout.specials).filter((tier) => tier > 0).length
    + $loadout.uniques.length
    + Object.values($loadout.stackables).reduce((total, count) => total + count, 0);
  $: selectedEntries = ALL_ABILITIES.flatMap((ability) => {
    if (ability.type === 'special' && ($loadout.specials[ability.id] || 0) > 0) return [{ ability, quantity: $loadout.specials[ability.id], label: `T${$loadout.specials[ability.id]}` }];
    if (ability.type === 'unique' && $loadout.uniques.includes(ability.id)) return [{ ability, quantity: 1, label: 'OWNED' }];
    if (ability.type === 'stackable' && ($loadout.stackables[ability.id] || 0) > 0) return [{ ability, quantity: $loadout.stackables[ability.id], label: `×${$loadout.stackables[ability.id]}` }];
    return [];
  });
  $: activeCount = selectedEntries.length;

  function isSelected(ability, currentLoadout) {
    return (ability.type === 'special' && (currentLoadout.specials[ability.id] || 0) > 0)
      || (ability.type === 'unique' && currentLoadout.uniques.includes(ability.id))
      || (ability.type === 'stackable' && (currentLoadout.stackables[ability.id] || 0) > 0);
  }

  function toggleUnique(id) {
    loadout.update((current) => ({
      ...current,
      uniques: current.uniques.includes(id) ? current.uniques.filter((item) => item !== id) : [...current.uniques, id],
    }));
  }

  function setSpecialTier(id, tier) {
    loadout.update((current) => ({ ...current, specials: { ...current.specials, [id]: tier } }));
  }

  function adjustStackable(id, delta) {
    loadout.update((current) => ({
      ...current,
      stackables: { ...current.stackables, [id]: Math.max(0, (current.stackables[id] || 0) + delta) },
    }));
  }

  function clearLoadout() {
    loadout.set({ specials: {}, uniques: [], stackables: {} });
  }

  function domainCount(domain) {
    return domain === 'All' ? ALL_ABILITIES.length : ALL_ABILITIES.filter((ability) => ability.cat.toLowerCase() === domain.toLowerCase()).length;
  }

  async function shareBuild() {
    const encoded = encodeLoadout($loadout);
    if (!encoded) return;
    const url = new URL(window.location.href);
    url.searchParams.set('b', encoded);
    await navigator.clipboard.writeText(url.toString());
    copied = true;
    setTimeout(() => copied = false, 1800);
  }

  onMount(() => {
    const encoded = new URLSearchParams(window.location.search).get('b');
    const decoded = encoded && decodeLoadout(encoded);
    if (decoded) loadout.set(decoded);
  });
</script>

<section class="ability-lab" aria-label="TEAR Ability Lab">
  <header class="lab-header">
    <div class="lab-title">
      <span class="eyebrow">THEORYCRAFT ENGINE / LIVE CONFIGURATION</span>
      <h1>ABILITY LAB</h1>
    </div>
    <div class="header-signal" aria-label="Game source information">
      <span class="signal-dot"></span>
      <span>ENGINE SYNCED</span>
      <code>{gameManifest.source.commit.slice(0, 7)}</code>
    </div>
    <div class="lab-actions">
      <button class="action-btn" on:click={clearLoadout}>RESET</button>
      <button class="action-btn primary" on:click={shareBuild}>{copied ? 'SIGNAL COPIED' : 'SHARE SIGNAL'}</button>
    </div>
  </header>

  <div class="signal-strip" aria-label="Current build status">
    <span><b>{selectedCount}</b> PICKS</span>
    <span><b>{activeCount}</b> ABILITIES</span>
    <span>SOURCE: COMMITTED REVISION</span>
    <span class="strip-last">SIMULATION: EXACT APPLY PIPELINE</span>
  </div>

  <div class="lab-grid">
    <aside class="loadout-rack" aria-label="Selected loadout">
      <div class="panel-heading">
        <span>01 / LOADOUT RACK</span>
        <span class="count">{activeCount}</span>
      </div>
      <p class="panel-note">ACTIVE COMPONENTS</p>
      {#if selectedEntries.length}
        <ul class="loadout-list">
          {#each selectedEntries as entry}
            <li class="loadout-item cat-{entry.ability.cat}">
              <span class="rack-name">{entry.ability.name}</span>
              <span class="rack-tier">{entry.label}</span>
              <button aria-label={`Remove ${entry.ability.name}`} class="remove-btn" on:click={() => entry.ability.type === 'special' ? setSpecialTier(entry.ability.id, 0) : entry.ability.type === 'unique' ? toggleUnique(entry.ability.id) : adjustStackable(entry.ability.id, -entry.quantity)}>×</button>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="empty-rack">
          <span>NO SIGNAL</span>
          <p>Select an ability module to begin a live engine simulation.</p>
        </div>
      {/if}
    </aside>

    <main class="catalogue">
      <div class="catalogue-toolbar">
        <div>
          <span class="panel-note">02 / CATALOGUE</span>
          <h2>{activeDomain === 'All' ? 'ALL ABILITY MODULES' : `${activeDomain.toUpperCase()} DOMAIN`}</h2>
        </div>
        <label class="search-field">
          <span>FILTER</span>
          <input bind:value={searchQuery} placeholder="NAME OR EFFECT" />
        </label>
      </div>

      <nav class="domain-tabs" aria-label="Ability domains">
        {#each domains as domain}
          <button class:active={activeDomain === domain} class="domain-tab cat-{domain.toLowerCase()}" on:click={() => activeDomain = domain} aria-pressed={activeDomain === domain}>
            <span>{domain}</span><b>{domainCount(domain)}</b>
          </button>
        {/each}
      </nav>

      {#if visibleAbilities.length}
        <div class="ability-grid">
          {#each visibleAbilities as ability}
            <article class:selected={isSelected(ability, $loadout)} class="ability-module cat-{ability.cat}">
              <div class="module-head">
                <span class="module-class">{ability.type === 'special' ? 'SPECIAL' : ability.type === 'unique' ? 'UNIQUE' : 'STACKS'}</span>
                <span class="module-domain">{ability.cat}</span>
              </div>
              <h3>{ability.name}</h3>
              <p>{ability.type === 'special' && ($loadout.specials[ability.id] || 0) > 0 ? ability.tiers[$loadout.specials[ability.id] - 1]?.desc : ability.desc}</p>

              {#if ability.type === 'special'}
                <div class="tier-rail" aria-label={`${ability.name} tier selector`}>
                  {#each Array.from({ length: ability.tiers.length + 1 }, (_, tier) => tier) as tier}
                    <button class:active={($loadout.specials[ability.id] || 0) === tier} on:click={() => setSpecialTier(ability.id, tier)}>{tier === 0 ? 'OFF' : `T${tier}`}</button>
                  {/each}
                </div>
              {:else if ability.type === 'unique'}
                <button class="module-toggle" class:active={isSelected(ability, $loadout)} aria-pressed={isSelected(ability, $loadout)} on:click={() => toggleUnique(ability.id)}>
                  {isSelected(ability, $loadout) ? 'INSTALLED' : 'INSTALL MODULE'}
                </button>
              {:else}
                <div class="stack-control" aria-label={`${ability.name} stack count`}>
                  <button aria-label={`Remove ${ability.name} stack`} on:click={() => adjustStackable(ability.id, -1)}>−</button>
                  <span>{$loadout.stackables[ability.id] || 0}<small> STACKS</small></span>
                  <button aria-label={`Add ${ability.name} stack`} on:click={() => adjustStackable(ability.id, 1)}>+</button>
                </div>
              {/if}
            </article>
          {/each}
        </div>
      {:else}
        <div class="no-results">NO MODULES MATCH THIS SIGNAL.</div>
      {/if}
    </main>

    <aside class:open={drawerOpen} class="telemetry-bay" aria-label="Combat telemetry">
      <button class="telemetry-toggle" on:click={() => drawerOpen = !drawerOpen} aria-expanded={drawerOpen}>
        <span>03 / COMBAT TELEMETRY</span><span>{drawerOpen ? 'CLOSE' : 'OPEN'}</span>
      </button>
      <div class="telemetry-scroll"><StatPanel /></div>
    </aside>
  </div>
</section>

<style>
  .ability-lab { --lab-ink: var(--sl-color-white); --lab-paper: var(--sl-color-black); --lab-line: var(--sl-color-hairline); --lab-cyan: #13c4d6; --lab-red: #e23b3b; --lab-blue: #2f6df0; --lab-purple: #8b3bd6; --lab-orange: #ef8a17; --lab-green: #1faf5a; color: var(--lab-ink); font-family: var(--sl-font-mono); margin: 1.5rem auto 4rem; max-width: 1540px; }
  .lab-header { border: 2px solid var(--lab-ink); display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr) auto auto; padding: 1rem 1.2rem; align-items: center; }
  .eyebrow, .panel-note, .module-class, .module-domain, .search-field > span { color: var(--sl-color-gray-3); display: block; font-size: .65rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
  .lab-title h1 { font-size: clamp(1.6rem, 3vw, 2.45rem); letter-spacing: .08em; line-height: 1; margin: .3rem 0 0; }
  .header-signal { align-items: center; border-left: 1px solid var(--lab-line); display: flex; font-size: .68rem; font-weight: 800; gap: .55rem; letter-spacing: .08em; padding-left: 1rem; white-space: nowrap; }
  .header-signal code { color: var(--lab-cyan); font: inherit; }
  .signal-dot { background: var(--lab-cyan); height: .55rem; width: .55rem; }
  .lab-actions { display: flex; gap: .5rem; }
  button { font: inherit; }
  .action-btn, .module-toggle, .tier-rail button, .stack-control button, .domain-tab, .remove-btn, .telemetry-toggle { border: 1px solid var(--lab-line); border-radius: 0; cursor: pointer; letter-spacing: .07em; text-transform: uppercase; transition: background .12s, color .12s, transform .12s; }
  .action-btn { background: transparent; color: var(--lab-ink); font-size: .68rem; font-weight: 800; padding: .72rem .85rem; }
  .action-btn:hover, .action-btn:focus-visible { background: var(--sl-color-gray-6); outline: 2px solid var(--lab-cyan); outline-offset: 2px; }
  .action-btn.primary { background: var(--lab-cyan); border-color: var(--lab-cyan); color: #071012; }
  .signal-strip { border: 1px solid var(--lab-line); border-top: 0; color: var(--sl-color-gray-3); display: flex; font-size: .64rem; font-weight: 700; gap: 0; letter-spacing: .08em; text-transform: uppercase; }
  .signal-strip span { border-right: 1px solid var(--lab-line); padding: .55rem .8rem; }
  .signal-strip b { color: var(--lab-ink); }
  .strip-last { margin-left: auto; }
  .lab-grid { display: grid; grid-template-columns: 250px minmax(0, 1fr) 340px; gap: 1rem; margin-top: 1rem; }
  .loadout-rack, .telemetry-bay { border: 1px solid var(--lab-line); background: var(--lab-paper); }
  .loadout-rack { align-self: start; padding: .9rem; position: sticky; top: 5.4rem; }
  .panel-heading { border-bottom: 1px solid var(--lab-line); display: flex; font-size: .72rem; font-weight: 800; justify-content: space-between; letter-spacing: .08em; padding-bottom: .75rem; }
  .panel-heading .count { color: var(--lab-cyan); }
  .panel-note { margin: .85rem 0 .5rem; }
  .loadout-list { list-style: none; margin: 0; padding: 0; }
  .loadout-item { align-items: center; border: 1px solid var(--lab-line); border-left: 4px solid var(--cat-color, var(--lab-cyan)); display: grid; gap: .4rem; grid-template-columns: minmax(0, 1fr) auto auto; margin-top: .4rem; padding: .55rem .45rem .55rem .6rem; }
  .rack-name { font-size: .72rem; font-weight: 800; line-height: 1.2; }
  .rack-tier { color: var(--cat-color, var(--lab-cyan)); font-size: .62rem; font-weight: 800; }
  .remove-btn { background: transparent; color: var(--sl-color-gray-3); font-size: 1rem; height: 1.25rem; line-height: 1; padding: 0; width: 1.25rem; }
  .remove-btn:hover { background: var(--lab-red); color: #fff; }
  .empty-rack { border: 1px dashed var(--lab-line); color: var(--sl-color-gray-3); font-size: .68rem; letter-spacing: .08em; padding: 1rem; text-transform: uppercase; }
  .empty-rack p { font-size: .72rem; letter-spacing: 0; line-height: 1.55; margin: .7rem 0 0; text-transform: none; }
  .catalogue-toolbar { align-items: end; border-bottom: 1px solid var(--lab-line); display: flex; gap: 1rem; justify-content: space-between; padding-bottom: .75rem; }
  .catalogue-toolbar h2 { border: 0; font-size: 1rem; letter-spacing: .07em; margin: .25rem 0 0; padding: 0; }
  .search-field { display: grid; gap: .35rem; min-width: min(100%, 16rem); }
  .search-field input { background: transparent; border: 1px solid var(--lab-line); border-radius: 0; color: var(--lab-ink); font: inherit; font-size: .7rem; font-weight: 700; padding: .65rem .7rem; width: 100%; }
  .search-field input:focus { border-color: var(--lab-cyan); outline: 2px solid color-mix(in srgb, var(--lab-cyan) 28%, transparent); }
  .domain-tabs { display: flex; flex-wrap: wrap; gap: .35rem; margin: .8rem 0; }
  .domain-tab { align-items: center; background: transparent; color: var(--sl-color-gray-3); display: flex; font-size: .65rem; font-weight: 800; gap: .55rem; justify-content: space-between; min-width: 5.5rem; padding: .55rem .6rem; }
  .domain-tab b { color: var(--cat-color, var(--lab-ink)); font-size: .62rem; }
  .domain-tab:hover, .domain-tab.active { background: var(--sl-color-gray-6); border-color: var(--cat-color, var(--lab-cyan)); color: var(--lab-ink); }
  .ability-grid { display: grid; gap: .65rem; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  .ability-module { --cat-color: var(--lab-cyan); background: var(--lab-paper); border: 1px solid var(--lab-line); border-left: 4px solid var(--cat-color); display: flex; flex-direction: column; min-height: 13.5rem; padding: .8rem; position: relative; }
  .ability-module.selected { border-color: var(--cat-color); background: color-mix(in srgb, var(--cat-color) 7%, var(--lab-paper)); }
  .module-head { display: flex; justify-content: space-between; }
  .module-domain { color: var(--cat-color); }
  .ability-module h3 { font-size: .95rem; line-height: 1.15; margin: .65rem 0 .45rem; text-transform: uppercase; }
  .ability-module p { color: var(--sl-color-gray-2); font-family: var(--sl-font); font-size: .78rem; line-height: 1.5; margin: 0 0 1rem; }
  .tier-rail, .stack-control { border-top: 1px solid var(--lab-line); display: flex; gap: .25rem; margin-top: auto; padding-top: .6rem; }
  .tier-rail button { background: transparent; color: var(--sl-color-gray-3); flex: 1; font-size: .62rem; font-weight: 800; padding: .48rem .25rem; }
  .tier-rail button.active { background: var(--cat-color); border-color: var(--cat-color); color: #071012; }
  .module-toggle { background: transparent; color: var(--cat-color); font-size: .64rem; font-weight: 800; margin-top: auto; padding: .62rem; }
  .module-toggle:hover, .module-toggle.active { background: var(--cat-color); border-color: var(--cat-color); color: #071012; }
  .stack-control { align-items: center; justify-content: space-between; }
  .stack-control button { background: transparent; color: var(--cat-color); font-size: 1rem; height: 2rem; width: 2rem; }
  .stack-control button:hover { background: var(--cat-color); color: #071012; }
  .stack-control span { font-size: 1rem; font-weight: 800; text-align: center; }
  .stack-control small { color: var(--sl-color-gray-3); display: block; font-size: .55rem; letter-spacing: .08em; }
  .telemetry-bay { align-self: start; max-height: calc(100vh - 5.6rem); position: sticky; top: 5.4rem; }
  .telemetry-toggle { background: var(--sl-color-gray-6); border: 0; border-bottom: 1px solid var(--lab-line); color: var(--lab-ink); display: flex; font-size: .68rem; font-weight: 800; justify-content: space-between; padding: .9rem; width: 100%; }
  .telemetry-toggle span:last-child { color: var(--lab-cyan); }
  .telemetry-scroll { max-height: calc(100vh - 9rem); overflow: auto; padding: .9rem; }
  .no-results { border: 1px dashed var(--lab-line); color: var(--sl-color-gray-3); font-size: .72rem; letter-spacing: .08em; padding: 2rem; text-align: center; }
  .cat-offense { --cat-color: var(--lab-red); } .cat-resilience { --cat-color: var(--lab-green); } .cat-mobility { --cat-color: var(--lab-blue); } .cat-throw { --cat-color: var(--lab-orange); } .cat-parry { --cat-color: var(--lab-cyan); } .cat-utility { --cat-color: var(--lab-purple); }
  @media (max-width: 1120px) { .lab-grid { grid-template-columns: 220px minmax(0, 1fr); } .telemetry-bay { grid-column: 1 / -1; max-height: none; position: static; } .telemetry-scroll { max-height: none; } }
  @media (max-width: 760px) { .ability-lab { margin-top: .5rem; } .lab-header { grid-template-columns: 1fr; } .header-signal { border-left: 0; border-top: 1px solid var(--lab-line); padding: .7rem 0 0; } .lab-actions { display: grid; grid-template-columns: 1fr 1fr; } .signal-strip { overflow-x: auto; } .signal-strip span { flex: 0 0 auto; } .strip-last { margin-left: 0; } .lab-grid { grid-template-columns: 1fr; } .loadout-rack { position: static; } .catalogue-toolbar { align-items: stretch; flex-direction: column; } .search-field { min-width: 0; } .ability-grid { grid-template-columns: 1fr; } .telemetry-bay { bottom: 0; max-height: 72vh; position: fixed; transform: translateY(calc(100% - 3rem)); transition: transform .18s ease; width: 100%; z-index: 30; } .telemetry-bay.open { transform: translateY(0); } .telemetry-scroll { max-height: calc(72vh - 3rem); } }
</style>
