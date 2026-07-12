// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	prefetch: true,
	integrations: [
		starlight({
			title: 'T E A R  Wiki',
			description: 'The complete community wiki for Tear — blades, bosses, and everything between.',
			logo: {
				light: './src/assets/logo-light.svg',
				dark: './src/assets/logo-dark.svg',
				replacesTitle: false,
			},
			social: [
				{ icon: 'github', label: 'Game Source', href: 'https://github.com' },
			],
			customCss: ['./src/styles/tear-theme.css'],
			// Versioning: tracks game patches
			// To add a new version: npm run starlight-version <tag>
			// (install @astrojs/starlight-versions when ready to cut v1.0)
			editLink: {
				baseUrl: 'https://github.com/your-repo/tear-wiki/edit/main/',
			},
			lastUpdated: true,
			pagination: true,
			favicon: '/favicon.svg',
			head: [
				{
					tag: 'meta',
					attrs: { property: 'og:image', content: '/og-cover.png' },
				},
				{
					tag: 'script',
					content: `(function(){
  const ring=document.createElement('div');ring.id='tear-cursor';
  const dot=document.createElement('div');dot.id='tear-cursor-dot';
  document.body.appendChild(ring);document.body.appendChild(dot);
  const K=150,D=7.5;
  let rx=-100,ry=-100,vx=0,vy=0,mx=-100,my=-100,rafId=0,lastT=0;
  document.addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    if(!ring.classList.contains('visible')){ring.classList.add('visible');dot.classList.add('visible');rx=mx;ry=my;}
    const el=document.elementFromPoint(mx,my);
    const onLink=el&&(el.closest('a')||el.closest('button')||el.closest('[role="button"]'));
    ring.classList.toggle('on-link',!!onLink);
  },{passive:true});
  document.addEventListener('mouseleave',()=>{ring.classList.remove('visible');dot.classList.remove('visible');});
  function frame(now){
    const dt=Math.min((now-lastT)/1000,0.05);lastT=now;
    const ax=(mx-rx)*K-vx*D,ay=(my-ry)*K-vy*D;
    vx+=ax*dt;vy+=ay*dt;rx+=vx*dt;ry+=vy*dt;
    ring.style.transform='translate('+(rx-ring.offsetWidth/2)+'px,'+(ry-ring.offsetHeight/2)+'px)';
    dot.style.transform='translate('+(mx-1.5)+'px,'+(my-1.5)+'px)';
    rafId=requestAnimationFrame(frame);
  }
  lastT=performance.now();rafId=requestAnimationFrame(frame);
  function initHpBars(){
    document.querySelectorAll('.tear-hp-bar-fill[data-hp]').forEach(bar=>{
      const io=new IntersectionObserver(entries=>{
        entries.forEach(e=>{if(e.isIntersecting){bar.style.width=(bar.dataset.hp||'0')+'%';io.unobserve(bar);}});
      },{threshold:0.4});io.observe(bar);
    });
  }
  initHpBars();
  document.addEventListener('astro:page-load',initHpBars);
  document.addEventListener('astro:before-swap',()=>cancelAnimationFrame(rafId));
  document.addEventListener('astro:page-load',()=>{lastT=performance.now();rafId=requestAnimationFrame(frame);});
})()
`,
				},
			],
			sidebar: [
				{
					label: '🗡️ Getting Started',
					items: [
						{ label: 'What is Tear?', slug: 'getting-started/overview' },
						{ label: 'Controls', slug: 'getting-started/controls' },
						{ label: 'HUD Guide', slug: 'getting-started/ui-guide' },
					],
				},
				{
					label: '⚙️ Mechanics',
					items: [
						{ label: 'The Blade', slug: 'mechanics/the-blade' },
						{ label: 'Combat & Damage', slug: 'mechanics/combat' },
						{ label: 'Slams & Launches', slug: 'mechanics/slams-and-launches' },
						{ label: 'Parry & Deflect', slug: 'mechanics/parry-and-deflect' },
						{ label: 'Style Meter', slug: 'mechanics/style-meter' },
						{ label: 'Dash', slug: 'mechanics/dash' },
						{ label: 'Status Effects', slug: 'mechanics/status-effects' },
					],
				},
				{
					label: '⬆️ Upgrades & Abilities',
					items: [
						{ label: 'Overview & Draft System', slug: 'upgrades' },
						{ label: 'Stackable Upgrades', slug: 'upgrades/stackable' },
						{ label: 'Offense Abilities', slug: 'upgrades/offense' },
						{ label: 'Resilience Abilities', slug: 'upgrades/resilience' },
						{ label: 'Mobility Abilities', slug: 'upgrades/mobility' },
						{ label: 'Parry Abilities', slug: 'upgrades/parry' },
						{ label: 'Throw Abilities', slug: 'upgrades/throw' },
					],
				},
				{
					label: '👁️ Enemies',
					items: [
						{ label: 'Enemy System', slug: 'enemies' },
						{ label: 'Charger', slug: 'enemies/charger' },
						{ label: 'Ranged', slug: 'enemies/ranged' },
						{ label: 'Flyer', slug: 'enemies/flyer' },
						{ label: 'Bomber', slug: 'enemies/bomber' },
						{ label: 'Armored', slug: 'enemies/armored' },
						{ label: 'Support', slug: 'enemies/support' },
						{ label: 'Wraith', slug: 'enemies/wraith' },
						{ label: 'Chimera', slug: 'enemies/chimera' },
						{ label: 'Affixes & Elites', slug: 'enemies/affixes' },
					],
				},
				{
					label: '💀 Bosses',
					items: [
						{ label: 'Boss Overview', slug: 'bosses' },
						{ label: 'The Warden', slug: 'bosses/warden' },
						{ label: 'The Iron Colossus', slug: 'bosses/iron-colossus' },
						{ label: 'Aldric', slug: 'bosses/aldric' },
						{ label: 'The Echo', slug: 'bosses/the-echo' },
						{ label: 'The Source', slug: 'bosses/the-source' },
					],
				},
				{
					label: '🌍 Stages',
					items: [
						{ label: 'Campaign Structure', slug: 'stages' },
						{ label: 'The Grounds', slug: 'stages/the-grounds' },
						{ label: 'The Undercroft', slug: 'stages/the-undercroft' },
						{ label: 'The Crimson Fields', slug: 'stages/the-crimson-fields' },
						{ label: 'The Voidspire', slug: 'stages/the-voidspire' },
						{ label: 'The Tear', slug: 'stages/the-tear' },
					],
				},
				{
					label: '🎮 Game Modes',
					items: [
						{ label: 'Modes & Difficulties', slug: 'modes' },
						{ label: 'Adventure', slug: 'modes/adventure' },
						{ label: 'Endless', slug: 'modes/endless' },
						{ label: 'Gauntlet', slug: 'modes/gauntlet' },
						{ label: 'Playground', slug: 'modes/playground' },
					],
				},
				{
					label: '🏆 Progression',
					items: [
						{ label: 'Achievements', slug: 'progression/achievements' },
						{ label: 'Daily Challenges', slug: 'progression/daily-challenges' },
						{ label: 'Meta Shop', slug: 'progression/meta-shop' },
					],
				},
				{
					label: '📖 Reference',
					items: [
						{ label: 'Stat Glossary', slug: 'reference/stat-glossary' },
						{ label: 'Colour Palette', slug: 'reference/color-palette' },
						{ label: 'Changelog', slug: 'reference/changelog' },
					],
				},
			],
		}),
		mdx(),
	],
});
