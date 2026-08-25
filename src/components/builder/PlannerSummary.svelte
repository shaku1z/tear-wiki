<script>
  export let selectedEntries = [];
  export let catalogCount = 0;

  $: tieredCount = selectedEntries.filter(({ ability }) => ability.type === 'tiered').length;
  $: uniqueCount = selectedEntries.filter(({ ability }) => ability.type === 'unique').length;
  $: stackCount = selectedEntries.filter(({ ability }) => ability.type === 'stackable').reduce((total, { quantity }) => total + quantity, 0);
</script>

<div class="planner-summary">
  <div class="summary-heading">
    <span class="summary-label">PUBLISHED PLANNER</span>
    <span class="summary-count">{catalogCount} MODULES</span>
  </div>

  <p class="summary-copy">This view records selections from the validated upgrade catalog. It does not calculate combat damage, runtime stats, or inferred synergies.</p>

  <div class="summary-grid" aria-label="Selected upgrade counts">
    <div><strong>{selectedEntries.length}</strong><span>MODULES</span></div>
    <div><strong>{tieredCount}</strong><span>TIERED</span></div>
    <div><strong>{uniqueCount}</strong><span>UNIQUE</span></div>
    <div><strong>{stackCount}</strong><span>STACKS</span></div>
  </div>

  <p class="summary-footnote">Descriptions and tier paths are copied from the published game-reference artifact. Use the game itself for live outcomes.</p>
</div>

<style>
  .planner-summary { border-top: 1px dashed var(--sl-color-hairline); margin-top: 1.4rem; padding-top: 1.1rem; }
  .summary-heading { display: flex; justify-content: space-between; gap: .75rem; }
  .summary-label, .summary-count { color: var(--sl-color-gray-3); font: 800 .65rem/1.2 var(--sl-font-mono); letter-spacing: .11em; text-transform: uppercase; }
  .summary-count { color: #13c4d6; }
  .summary-copy, .summary-footnote { color: var(--sl-color-gray-3); font: .76rem/1.5 var(--sl-font); margin: .8rem 0 0; text-transform: none; }
  .summary-grid { display: grid; gap: .45rem; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 1rem; }
  .summary-grid > div { background: var(--sl-color-black); border: 1px solid var(--sl-color-hairline); display: grid; gap: .15rem; padding: .6rem; }
  .summary-grid strong { color: var(--sl-color-white); font: 800 1.15rem/1 var(--sl-font-mono); }
  .summary-grid span { color: var(--sl-color-gray-3); font: 800 .56rem/1.2 var(--sl-font-mono); letter-spacing: .08em; }
  .summary-footnote { border-left: 2px solid #13c4d6; padding-left: .65rem; }
</style>
