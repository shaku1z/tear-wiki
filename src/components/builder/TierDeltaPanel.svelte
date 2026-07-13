<script>
  export let ability = null;
  export let tier = 0;

  $: current = ability?.tierLevels?.[tier - 1] || null;
  $: previous = ability?.tierLevels?.[tier - 2] || null;
</script>

{#if ability && current}
  <section class="tier-delta" aria-label={`${ability.name} Tier ${tier} comparison`}>
    <header>
      <span>TIER DELTA / LIVE EVOLUTION</span>
      <b>{ability.name.toUpperCase()} · T{tier}</b>
    </header>
    <div class="delta-route">
      <span>{previous ? `T${previous.level}` : 'OFF'}</span><i>→</i><strong>T{current.level}</strong><em>{current.source === 'draft' ? 'DRAFT PICKUP' : 'BOSS EVOLUTION'}</em>
    </div>
    <div class="delta-copy">
      <div><small>{previous ? `T${previous.level} EFFECT` : 'UNSELECTED'}</small><p>{previous?.desc || 'No module is installed before Tier 1.'}</p></div>
      <div class="current"><small>T{current.level} EFFECT</small><p>{current.desc}</p></div>
    </div>
    <footer>SIMULATOR APPLIES T1 → T{current.level} IN ORDER</footer>
  </section>
{/if}

<style>
  .tier-delta { border: 1px solid var(--sl-color-hairline); font-family: var(--sl-font-mono); margin-bottom: .9rem; }
  header, footer { background: var(--sl-color-gray-6); color: var(--sl-color-gray-3); display: flex; font-size: .56rem; font-weight: 800; justify-content: space-between; letter-spacing: .08em; padding: .55rem .6rem; text-transform: uppercase; }
  header { border-bottom: 1px solid var(--sl-color-hairline); } header b { color: var(--tear-cyan); font: inherit; max-width: 58%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  footer { border-top: 1px solid var(--sl-color-hairline); color: var(--tear-cyan); font-size: .52rem; }
  .delta-route { align-items: center; border-bottom: 1px solid var(--sl-color-hairline); display: flex; gap: .35rem; padding: .55rem .6rem; } .delta-route span { color: var(--sl-color-gray-3); font-size: .65rem; } .delta-route i { color: var(--sl-color-gray-3); font-style: normal; } .delta-route strong { color: var(--tear-cyan); font-size: .78rem; } .delta-route em { color: var(--sl-color-gray-3); font-size: .52rem; font-style: normal; font-weight: 800; letter-spacing: .06em; margin-left: auto; }
  .delta-copy { display: grid; grid-template-columns: 1fr 1fr; } .delta-copy > div { min-width: 0; padding: .6rem; } .delta-copy > div + div { border-left: 1px solid var(--sl-color-hairline); } small { color: var(--sl-color-gray-3); display: block; font-size: .52rem; font-weight: 800; letter-spacing: .08em; } .current small { color: var(--tear-cyan); } p { color: var(--sl-color-gray-2); font-family: var(--sl-font); font-size: .68rem; line-height: 1.4; margin: .4rem 0 0; text-transform: none; }
  @media (max-width: 760px) { .delta-copy { grid-template-columns: 1fr; } .delta-copy > div + div { border-left: 0; border-top: 1px solid var(--sl-color-hairline); } }
</style>
