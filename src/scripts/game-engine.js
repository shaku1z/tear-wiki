
// --- utils.js ---
// ------- small math / geometry helpers -------
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function len(x, y) { return Math.hypot(x, y); }

// shortest-path angle lerp
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// closest distance from point C to segment AB, returns {dist, px, py}
function segPointDist(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((cx - ax) * dx + (cy - ay) * dy) / l2;
  t = clamp(t, 0, 1);
  const px = ax + dx * t, py = ay + dy * t;
  return { dist: len(cx - px, cy - py), px, py };
}

// segment AB intersects circle (cx,cy,r)?
function segCircle(ax, ay, bx, by, cx, cy, r) {
  return segPointDist(ax, ay, bx, by, cx, cy).dist <= r;
}

// axis-aligned overlap of two rects (center-based, half extents)
function aabbOverlap(ax, ay, ahw, ahh, bx, by, bhw, bhh) {
  // strict: merely *touching* an edge (e.g. standing exactly on a floor) is not
  // an overlap. With <= , resting on the ground registered as a horizontal
  // collision and killed left/right movement every frame.
  return Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;
}


// --- config.js ---
// ============================================================
//  TUNING — everything you'd want to tweak for "feel" lives here.
//  All units are pixels and seconds unless noted.
// ============================================================
const CONFIG = {
  view: { w: 1600, h: 900 },

  world: {
    gravity: 2400,        // downward accel on player/enemies
    groundY: 800,         // top surface of the floor
  },

  player: {
    w: 32, h: 50,
    moveSpeed: 430,       // top horizontal run speed
    thrownMoveBoost: 1.15, // +15% move speed while the blade is thrown (no weapon)
    groundAccel: 5000,    // how fast you reach moveSpeed on ground
    airAccel: 2800,       // air control
    friction: 6000,       // ground stopping power when no input
    jumpSpeed: 920,       // initial upward velocity on jump
    coyoteTime: 0.10,     // grace window to jump after leaving ground
    jumpBuffer: 0.10,     // grace window to register early jump press
    maxFall: 1800,
    hp: 100,
    hitIframe: 0.9,       // invuln window after taking a hit
    dmgTakenMult: 1,      // scaled down by the "Tough Hide" upgrade
  },

  dash: {
    speed: 1500,          // burst speed
    duration: 0.15,       // how long the burst lasts
    cooldown: 0.55,       // time before you can dash again
    iframe: 0.15,         // invuln during the dash
    endSpeedKeep: 0.35,   // fraction of dash speed retained when it ends
    steer: 15,            // mid-dash steering rate: hold W/S/A/D to bend the dash that way
  },

  blade: {
    length: 95,           // hilt -> tip distance
    handOffsetX: 0,       // hand anchor relative to player center
    handOffsetY: -6,
    aimRadius: 85,        // reticle orbits the player within this radius (= resting tether length)
    minTether: 0.45,      // hold left-click -> tether eases down to this fraction of aimRadius
    aimSensitivity: 0.9,  // mouse-movement -> reticle movement (pointer-lock mode)
    springStiffness: 150, // pull of the blade toward the reticle (lag/momentum source)
    damping: 7.5,         // velocity damping (higher = less floaty)
    gravity: 900,         // weight of the blade itself (droops when idle)
    maxReach: 120,        // elastic leash: max hilt distance from hand (momentum overshoot)
    leashStiffness: 55,   // how hard the leash pulls back past maxReach
    maxSpeed: 7000,       // hard clamp so it never explodes
    angleSmooth: 35,      // how quickly the blade angle settles (higher = snappier)
    leadAmount: 0.45,     // how much a fast swing whips the tip ahead of the aim line
    leadSpeedRef: 2600,   // swing speed at which the lead is fully applied
    minHitSpeed: 950,     // tip speed below this deals no damage
    damageScale: 0.0092,  // damage per (px/s) of tip speed over the minimum (lower base)
    maxDamage: 58,
    enemyHitIframe: 0.18, // per-enemy cooldown between blade hits
    deflectMinSpeed: 700, // tip speed needed to deflect a projectile
    deflectBoost: 1.25,   // speed multiplier applied to deflected projectiles
    deflectDmgMult: 1,    // Counterforce: bonus damage on reflected shots
    perfectSpeed: 2400,   // tip speed for a PERFECT parry (homing ricochet, bonus dmg)
    counterParryFactor: 0.55, // perfect-parry threshold multiplier when swinging straight back at the shot
    slamMultiplier: 1.8,  // damage multiplier for a downward airborne slam
    slamMinDownSpeed: 1750, // downward tip speed needed to count as a slam
    slamPowerSpeed: 1700,   // player descent speed for a full committed "power slam"
    slamPowerBonus: 0.7,    // up to +70% slam damage from a fast committed descent
    slamEmpowerAt: 0.5,     // descent fraction above which a slam becomes a POWER SLAM (⇊)
    launchMinUpSpeed: 1250, // upward tip speed needed to pop an enemy airborne
    launchPower: 780,     // upward velocity imparted by a launcher swing
    risingSpeedRef: 850,  // player upward speed for a full rising-uppercut bonus
    risingDmgBonus: 0.9,  // up to +90% launch damage while rising fast (jump / up-dash)
    risingLaunchBonus: 0.7, // up to +70% extra pop/knockback on a rising uppercut

    // right-click to throw the blade; right-click near it (within reclaimDistance) to recall
    throw: {
      speed: 1900,        // base launch speed (faster than before)
      speedFromSwing: 0.45, // + this * tip speed at release (flinging adds speed)
      maxSpeed: 4600,
      damage: 22,         // base pierce damage (lower than before)
      damageFromSpeed: 0.008, // + per (px/s) of launch speed
      recallMult: 1,      // Whetstone: bonus damage on the returning (recall) blade
      hiMult: 1.4,        // throw (outgoing) hits enemies ABOVE half HP harder
      loMult: 0.65,       // ...and below-half HP softer (recall is the reverse: a finisher)
      lobRadius: 160,     // hammer "lob" throw: shockwave radius on impact
      lobStun: 0.8,       // hammer "lob" throw: stun applied to caught enemies
      reclaimDistance: 384, // how close you must be to recall (~tether)
      returnSpeed: 3400,  // speed the blade flies back to your hand (snappy)
      maxLife: 2.5,       // safety: embed after this long in flight
    },
  },

  // ---- skill shaping: rewards clean, committed, stylish swings over flailing ----
  skill: {
    pokeFloor: 0.4,       // a pure straight thrust deals 40% of a clean perpendicular cut
    commitRef: 620,       // hilt speed (px/s) for full "committed arm swing" credit
    commitFloor: 0.5,     // a tip-flick with a still hand deals 50%
    styleDamage: 0.06,    // +6% swing damage per trick tier above 1 (NICE..TEARING)
    styleDamageMax: 0.4,  // hard cap on the style->damage bonus
    aerialRaveCap: 0.5,   // Aerial Rave airborne-damage cap (raised by its tiers)
  },

  // ---- resilience: survivability is EARNED through skill, never a heal button ----
  resilience: {
    parryGuardTime: 1.2,    // Riposte: seconds of damage reduction after a perfect parry
    parryGuardMult: 0.4,    // ...damage taken during that window (-60%)
    flowGuardTier: 3,       // Flow Guard: trick multiplier (x3 = BRUTAL) needed to be protected
    flowGuardMult: 0.7,     // ...damage taken while above that rank (-30%)
    maxShield: 2,           // Aegis: max stored one-hit absorb pips
    bloodriteHeal: 8,       // Bloodrite: HP restored per SKILL kill (slam/spike/perfect-parry)
    lifestealPerSwing: 1.5, // Vampiric Edge: HP per swing...
    lifestealCd: 0.5,       // ...but at most once per this many seconds (capped per-swing, not per-hit)
  },

  // ---- status effects (applied by Special abilities; ticked on enemies) ----
  status: {
    bleedDps: 6,     // damage per second PER bleed stack
    bleedDur: 3.2,   // bleed duration in seconds (refreshed when re-stacked)
    bleedMax: 8,     // max bleed stacks on one enemy
    burnDps: 20,     // burn damage per second
    burnDur: 2.6,    // burn duration
    markMult: 1.30,  // a MARKED enemy takes +30% damage from everything
    markDur: 4.0,    // mark duration
  },

  juice: {
    trailSamples: 14,     // length of the blade swoosh trail
    trailMinStep: 6,      // min tip travel between samples to draw an arc segment
    trailAlpha: 0.22,     // max opacity of the swoosh
    shakeBig: 11,         // screen-shake magnitude on big / slam / perfect hits
    shakeSmall: 4,
    shakeDecay: 45,       // how fast shake settles
    sparkCount: 9,        // sparks per blade hit
    deathShards: 12,      // shards on an enemy death
    bannerTime: 1.3,      // wave-start banner duration
    parrySlowmo: 0.18,    // seconds of slow-mo on a perfect parry
    parrySlowScale: 0.28, // time scale during parry slow-mo
    zoomBig: 0.05,        // camera zoom-punch on big hits
    zoomParry: 0.10,      // camera zoom-punch on perfect parry
    flashParry: 0.55,     // invert-flash strength on perfect parry
    dashGhostInterval: 0.028, // seconds between dash afterimages
  },

  // charger: melee rusher that closes distance
  enemy: {
    w: 40, h: 40,
    speed: 150,
    hp: 86,
    contactDmg: 12,
    knockbackTaken: 9,    // knockback per point of damage received
    weight: 1,            // resists launches/flings (higher = harder to pop airborne)
    respawnDelay: 1.4,
    // bull-charge (baseline melee): watch -> wind up -> commit a fast lunge; whiff = stun
    chargeRange: 420,     // distance at which it commits to a charge
    chargeWindup: 0.55,   // telegraph before the lunge
    chargeSpeed: 760,     // lunge burst speed
    chargeTime: 0.5,      // how long the lunge lasts
    chargeStun: 1.1,      // stun if the lunge slams a wall/platform (the punish window)
    chargeCd: 1.2,        // recovery before it can charge again
  },

  // ranged: keeps its distance, winds up a telegraphed shot, then kites away
  ranged: {
    w: 34, h: 44,
    speed: 175,
    hp: 60,
    contactDmg: 8,
    knockbackTaken: 12,
    preferredDist: 380,   // distance it likes to sit at
    tooClose: 250,        // flee if the player is closer than this
    windup: 0.7,          // telegraph time before firing
    aimInterval: 2.3,     // time between shots while kiting
    projSpeed: 800,       // shooters fire fast now (deadlier, demands real dodging/parry)
    weight: 1,
  },

  // flyer: hovers and swoops, ignores gravity/platforms
  flyer: { w: 36, h: 26, hp: 44, speed: 230, contactDmg: 10, knockbackTaken: 14, weight: 0.75, swoopInterval: 3.3, swoopSpeed: 700, hoverY: 150 },
  // bomber: lobs arcing, deflectable bombs from a distance (parry one back to blow it
  // up in their face). Trapper variant plants mines; Juggler throws 3 in a burst.
  bomber: { w: 34, h: 34, hp: 40, speed: 165, contactDmg: 8, knockbackTaken: 11, weight: 1,
    standoff: 340, lobInterval: 2.4, bombSpeed: 540, bombArc: 540, bombGravity: 1150,
    blastRadius: 150, blastDmg: 24, mineArm: 1.3, mineTrigger: 66, mineInterval: 2.2 },
  // armored: shielded on the side it faces; takes reduced damage on the ground,
  // normal/extra in the air -> you must launch ("updraft") it to kill efficiently
  armored: { w: 46, h: 46, hp: 154, speed: 95, contactDmg: 14, knockbackTaken: 3, weight: 2.2, breakSpeed: 1500, groundDR: 0.5, airDR: 1.15,
    stompCd: 3.2, stompWindup: 0.55, stompRange: 400, shockSpeed: 560, shockDmg: 16, shockR: 15 },
  // boss: large, multi-phase (very heavy -> barely flinchable)
  boss: { w: 118, h: 118, hp: 1900, speed: 70, contactDmg: 20, knockbackTaken: 0.6, weight: 6, fireBase: 2.0 },
  // The Echo (Stage 4 boss): your own silhouette — mirrors your tricks -> splits -> turns invisible
  echo: {
    w: 32, h: 50, hp: 3000, speed: 280, contactDmg: 18, knockbackTaken: 0.5, weight: 4,
    copyDelay: 0.55, shockDmg: 16, shockSpeed: 700, projSpeed: 820, projDmg: 14,
    invisCycle: 10, invisDur: 3.5, lungeSpeed: 1500,
  },
  // The Source (Stage 5 FINAL boss): a floating rift that cycles every fallen boss's
  // signature mechanic, collapses the floor, fakes its death, then erupts into a true form
  source: {
    w: 116, h: 128, hp: 4200, speed: 125, contactDmg: 22, knockbackTaken: 0.35, weight: 7,
    floorTier: 0.62, fakeTier: 0.34, reviveFrac: 0.46,
    cycleCd: 2.5,           // seconds between mechanic casts (phase 1)
    shockDmg: 18, shockSpeed: 720, shockR: 16,
    sweeperDmg: 18, sweeperSpeed: 600,
    crossDmg: 16, crossSpeed: 740,
    copyDelay: 0.5,
    collapseCd: 1.3,        // phase 2: rip a platform out this often
    regenRate: 0.05,        // fake-death HP regen (fraction of max per second)
  },
  // The Berserker King / Aldric (Stage 3 boss): a duel -> a throne of fire -> a fake death & frenzy
  aldric: {
    w: 116, h: 132, hp: 3400, speed: 130, contactDmg: 22, knockbackTaken: 0.3, weight: 7,
    atkCd: 1.7, windup: 0.45, lungeSpeed: 1150, shockDmg: 18, shockSpeed: 740, shockR: 20,
    fireTier: 0.65, fakeTier: 0.20, regenRate: 0.05, reviveFrac: 0.5,   // regen 5%/s up to 50% during the fake
    fireCols: 8, fireCycle: 3.0,                                        // checkerboard of fire, pulses every 3s
    frenzyDmgTaken: 1.35, downedDmgTaken: 0.3, chargeCd: 13, chargeWindup: 0.5, chargeSpeed: 1550,
  },
  // The Iron Colossus (Stage 2 boss): a tank with a front shield -> a thrown sweeping arm -> an exposed core
  colossus: {
    w: 152, h: 150, hp: 2900, speed: 58, contactDmg: 24, knockbackTaken: 0, weight: 9,
    atkCd: 2.5, windup: 0.6, shockDmg: 20, shockSpeed: 720, shockR: 24,
    chargeWindup: 0.7, chargeSpeed: 1350,
    sweeperDmg: 16, sweeperSpeed: 540, sweeperY: 540,
    panelCount: 4, crossDmg: 14, crossSpeed: 640, crossCd: 2.2,
  },
  // The Warden (Stage 1 boss): a methodical guard who weaponizes the arena across 3 phases
  warden: {
    batonCd: 2.1, batonWindup: 0.5, mortarShots: 3, mortarSpeed: 760, mortarGravity: 900, mortarDmg: 14,
    bashRange: 150, bashKnock: 620,
    zoneCount: 3, zoneW: 200, zoneShift: 7, zoneTick: 7, zoneTickCd: 0.4,   // phase-2 prohibited zones
    shockDmg: 18, shockSpeed: 700, shockR: 18,
    ceilingY: 150, ceilDropCd: 1.6, lungeCd: 7.5, lungeWindup: 0.55, lungeSpeed: 1500,   // phase-3 ceiling: lock + telegraph, then dive
  },

  // support: no real attack — they make every OTHER enemy worse, so they're priority kills
  support: { w: 32, h: 42, hp: 44, speed: 125, contactDmg: 6, knockbackTaken: 13, weight: 1,
    range: 240, keepAway: 330, menderRate: 11,
    drMult: 0.5, dmgBuff: 1.35,        // War Priest: protects AND empowers nearby enemies
    speedBuff: 1.45, hasteBuff: 1.5,   // Herald: faster movement AND faster attacks
    anchorDR: 0.4, anchorRegen: 9 },   // Anchor: shields + regens + immobilizes its bonded ally (shared fate)
  // wraith: immune to direct blade hits — only your thrown blade or a deflected shot kills it
  wraith: { w: 36, h: 42, hp: 64, speed: 170, contactDmg: 12, knockbackTaken: 0, weight: 1.4, hoverY: 70 },
  // chimera: a beast that adopts the attacks of the enemy types in its wave (often several),
  // cycling through them — the wind-up tells you which one is coming
  chimera: { w: 38, h: 48, hp: 84, speed: 150, contactDmg: 12, knockbackTaken: 9, weight: 1, copyDelay: 0.55 },

  // elite variants of basic enemies
  elite: { hpMult: 2.2, speedMult: 1.3, dmgMult: 1.5, sizeMult: 1.2, chancePerWave: 0.06, chanceMax: 0.35 },

  proj: { r: 9, dmg: 10, speed: 640 },
  // Marksman's charged shot: a long telegraphed charge, then a DEADLY long-range snap bolt —
  // the fastest, hardest-hitting shot in the game. Parrying it back is hugely rewarding.
  chargedShot: { r: 11, dmg: 30, speed: 1900, windup: 1.4 },

  // exotic variants (Round 4c)
  exotic: {
    exWindup: 1.3, exShockDmg: 24, exShockSpeed: 640, exShockR: 19,        // Executioner: long overhead -> heavy shocks both sides
    gravWindup: 0.9, gravReach: 120, gravDmg: 22, gravShockR: 24, gravShockSpeed: 420,  // Gravedigger: wide swing starting at mid-range (safe point-blank)
    duelCd: 2.4,                                                            // Duelist: parries a thrown blade, then must recover
    warlockSpeed: 430, warlockDmg: 12, warlockCurveAt: 0.42,               // Warlock: slow shot that curves once toward you
    chainSpeed: 560, chainRoot: 1.4, chainDmg: 8, chainR: 12,              // Chain: roots you in place on hit
    sludgeSpeed: 360, sludgeArc: 480, sludgeGravity: 1150, sludgeR: 12,    // Sludge: lobs mud that...
    sludgeZoneR: 72, sludgeZoneLife: 5, sludgeSlow: 0.45, sludgeInterval: 2.6,  // ...makes a slowing puddle
    geoChannel: 1.8, geoWallW: 26, geoWallH: 155, geoWallLife: 9, geoInterval: 5, geoRange: 540,  // Geomancer: raises a temporary wall
  },

  // accent palette — player stays black on white; enemies/shots/FX carry the color
  colors: {
    charger: "#e23b3b",        // red
    ranged: "#2f6df0",         // blue
    flyer: "#8b3bd6",          // purple
    bomber: "#ef8a17",         // orange
    armored: "#3a4654",        // slate
    armoredShield: "#15c2c2",  // cyan
    boss: "#b01030",           // crimson
    priest: "#a64dd6",         // support: damage-reduction aura
    herald: "#e0902f",         // support: speed buff
    mender: "#1faf5a",         // support: heals allies
    anchor: "#1597c2",         // support: shields a tethered ally
    wraith: "#6a6f88",         // special: blade-immune phantom
    chimera: "#444a5c",        // special: adopts other enemies' attacks
    sludge: "#6f7a35",         // hazard: slowing mud puddle
    enemyShot: "#e23b3b",      // incoming projectile
    deflected: "#1faf5a",      // your reflected projectile (green)
    perfect: "#13c4d6",        // perfect parry / counter (cyan)
    slam: "#ef8a17",           // slam impact (orange)
    scarf: "#d8324a",          // player's flowing scarf
    bladeTrail: "#13c4d6",     // sword swoosh trail
    bladeGlow: "#13c4d6",      // charged tip glow (fast swing)
    eye: "#13c4d6",            // player visor
  },

  hitStop: { threshold: 22, big: 0.07, small: 0.025 }, // freeze-frame on impact

  // ---- run / wave pacing (endless mode) ----
  run: {
    maxConcurrent: 6,     // simultaneous live enemies cap (rest queue up)
    spawnInterval: 0.7,   // seconds between spawns within a wave
    firstWaveCount: 3,    // enemies in wave 1
    countPerWave: 1.4,    // + this many enemies per wave thereafter
    hpScalePerWave: 0.12, // +12% enemy HP per wave
    scorePerKill: 6,      // score per kill (x wave x combo) — tuned so a strong run reads in the low thousands, not the hundred-thousands
    scoreMult: 1,         // raised by the "Bounty Hunter" upgrade
    coinMult: 1,          // raised by the "Fortune" upgrade
    healEachWave: 12,     // HP restored on wave clear (Normal only) — modest; sustain is earned
    startDelay: 0.8,      // beat before the first spawn of a wave
    waveClearPause: 0.8,  // delay after the last enemy dies before the draft appears
    // ---- campaign curve: gentle within a stage, a clear step UP between stages ----
    // (endless keeps the flat per-wave ramp above; campaign uses these instead)
    stageHpStep: 0.34,    // +34% enemy HP per stage entered
    inStageHp: 0.06,      // +6% enemy HP per wave WITHIN a stage
    stageDmgStep: 0.14,   // +14% enemy contact damage per stage
    inStageDmg: 0.02,     // +2% damage per wave within a stage
    stageCountStep: 2,    // +2 enemies per wave per stage — later stages field real hordes
    concurrentPerStage: 1, // +1 on-screen enemy cap per stage in campaign (more pressure deeper in)
    maxConcurrentCap: 10,  // ...but never more than this many at once
  },

  // ---- "Attack Trick" style meter ----
  trick: {
    decay: 2.6,         // seconds without a trick before the meter starts draining
    drainRate: 26,      // gauge points lost per second once draining
    hitLoss: 0.5,       // fraction of the gauge lost when you take a hit
    variety: 1.5,       // points multiplier when the trick differs from the last one
    // gauge thresholds -> score multiplier + rank name
    tiers: [
      { at: 0,   mult: 1, name: "" },
      { at: 14,  mult: 1.5, name: "NICE" },
      { at: 34,  mult: 2,   name: "STYLISH" },
      { at: 64,  mult: 3,   name: "BRUTAL" },
      { at: 110, mult: 4,   name: "SAVAGE" },
      { at: 175, mult: 5,   name: "TEARING!" },
    ],
    pts: { hit: 2, throwHit: 4, deflect: 5, launch: 5, slam: 8, superslam: 11, updraft: 10, parry: 12 },
  },

  // ---- difficulties (selectable from the menu) ----
  // mods scale enemy HP / your damage-taken / spawn count + the coin & score rewards
  // (risk = reward). Normal is the baseline (all 1.0). One-Hit keeps the deadly flag.
  difficulties: [
    { id: "easy",    label: "Easy",    desc: "Gentler enemies, lighter hits.",      mods: { hp: 0.80, dmg: 0.65, count: 0.85, coin: 0.80, score: 0.70 } },
    { id: "normal",  label: "Normal",  desc: "The intended balance.",                mods: { hp: 1.00, dmg: 1.00, count: 1.00, coin: 1.00, score: 1.00 } },
    { id: "hard",    label: "Hard",    desc: "Tougher, hungrier, more of them.",     mods: { hp: 1.30, dmg: 1.35, count: 1.15, coin: 1.30, score: 1.40 } },
    { id: "extreme", label: "Extreme", desc: "Brutal — but fair. Big rewards.",      mods: { hp: 1.70, dmg: 1.80, count: 1.30, coin: 1.70, score: 2.00 } },
    { id: "onehit",  label: "One-Hit", desc: "One touch and you fall. Max reward.",  oneHit: true, mods: { hp: 0.90, dmg: 1.00, count: 1.00, coin: 1.80, score: 2.20 } },
  ],

  // ---- modes (endless live; others reserved for later) ----
  modes: [
    { id: "campaign", label: "Adventure",          enabled: true,
      blurb: "Journey through biomes — 9 waves then a boss, stage after stage, ever deeper." },
    { id: "endless", label: "Endless",            enabled: true,
      blurb: "Survive forever — biomes cycle, hordes swell, mini-bosses crash in. Chase your best." },
    { id: "gauntlet", label: "Gauntlet",           enabled: true,
      blurb: "Endless, but a full boss storms in every 8 waves — cycling all five, ever tougher." },
    { id: "playground", label: "Playground",       enabled: true, training: true,
      blurb: "An open arena — spawn any enemy, grab any ability at any tier, test everything." },
    { id: "tutorial", label: "Tutorial",            enabled: true, training: true,
      blurb: "Learn the blade: swings, slams, power slams, launches, juggles, updrafts, throws, parries." },
    { id: "bossonly", label: "Boss Test",          enabled: true, bossOnly: true, debug: true,
      blurb: "Boss gauntlet — fight every boss in a row, evolving an ability after each." },
    { id: "sandbox",  label: "Enemy Test",          enabled: true, sandbox: true, debug: true,
      blurb: "Sandbox: every enemy variant spawns from wave 1 — try the full roster." },
  ],
};

// live theme: foreground "ink" colour + a separating "rim" halo, derived from the
// CURRENT background's luminance each frame so the HUD, player, blade, and enemies
// stay readable on ANY backdrop — light biome, dark void, or anything in between.
// THEME.set(bg) is called once per frame with the colour actually being painted.
function _relLum(hex) {
  hex = (hex || "#fff").replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;   // 0 (black) .. 1 (white)
}
// graphics quality — when low, the costly per-frame effects (rim/blade/rift glow
// shadowBlur, ambient motes) are skipped so the CrazyGames embed / low-end mobile
// stays smooth. Resolved from the user's setting (auto/high/low) in applySettings.
const GFX = { low: false };

// fullscreen overscan (logical px of scene BLEED per side). The gameplay arena is a
// fixed 1600x900 for every player; on displays that aren't 16:9 the backing store fills
// the whole screen and the SCENE (sky, backdrop, floor, dims) extends into the extra
// space — true fullscreen with no letterbox bars and no distortion. game.js computes
// this in resizeCanvas; the renderers + input read it. 0/0 in windowed and on 16:9.
const OVERSCAN = { x: 0, y: 0 };

// mobile hardware safe-area insets (notches, dynamic islands, rounded corners), in
// LOGICAL px per side — measured from CSS env(safe-area-inset-*) by resizeCanvas.
// HUD anchors and touch controls stay inside these.
const SAFE = { l: 0, r: 0, t: 0, b: 0 };

// touch tuning: thumb-on-glass has more friction than a mouse on a mat, so touch aim
// deltas get a boost — max blade momentum from shorter, sharper flicks.
CONFIG.touch = { aimBoost: 1.5 };

// live balance knobs, overridable via Firebase Remote Config (standalone build) WITHOUT
// a redeploy. All default to 1.0 (no change); applied to per-run values at run start, so
// tweaking them can never destabilize the config-restore system. Set matching numeric
// parameters in the Firebase console (Remote Config) to tune the live game.
const REMOTE = { coinMult: 1, enemyHpMult: 1, enemyDensityMult: 1, scoreMult: 1 };

const THEME = {
  ink: "#0a0a0a", rim: "rgba(0,0,0,0.35)", paper: "#ffffff", dark: false,
  set(bg) {
    const L = _relLum(bg);
    this.dark = L < 0.5;
    this.paper = bg;
    this.ink = this.dark ? "#ecebf6" : "#0a0a0a";              // light ink on dark, near-black on light
    // a soft halo around models so the silhouette separates from the bg on either polarity:
    // a luminous glow on dark stages, a drop-shadow on light ones.
    this.rim = this.dark ? "rgba(150,180,255,0.55)" : "rgba(0,0,0,0.32)";
  },
};


// --- particles.js ---
// ------- lightweight FX: sparks + shockwave rings + shards (color-aware) -------
const FX = {
  list: [],

  reset() { this.list.length = 0; },

  spark(x, y, dirX, dirY, col) {
    const a = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 1.3;
    const sp = 220 + Math.random() * 460;
    this.list.push({
      type: "spark", x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      col: col || "#000",
      life: 0.22 + Math.random() * 0.12, max: 0.34,
    });
  },

  burst(x, y, dirX, dirY, n, col) {
    for (let i = 0; i < n; i++) this.spark(x, y, dirX, dirY, col);
  },

  ring(x, y, r0, col) {
    this.list.push({ type: "ring", x, y, r: r0 || 6, col: col || "#000", life: 0.32, max: 0.32 });
  },

  // a spinning shard (used for enemy death shatter)
  shard(x, y, col) {
    const a = Math.random() * Math.PI * 2;
    const sp = 160 + Math.random() * 460;
    this.list.push({
      type: "shard", x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
      rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 18,
      size: 5 + Math.random() * 7, col: col || "#000",
      life: 0.4 + Math.random() * 0.25, max: 0.65,
    });
  },

  death(x, y, n, col) {
    for (let i = 0; i < (n || 11); i++) this.shard(x, y, col);
    this.ring(x, y, 10, col);
    this.ring(x, y, 4, col);
  },

  // ---- explosion kit: a bright flash, expanding shockwave rings, smoke ----
  flash(x, y, r, col) { this.list.push({ type: "flash", x, y, r: r || 50, col: col || "#fff", life: 0.18, max: 0.18 }); },
  shockwave(x, y, r0, col, maxR, thick) {
    const life = 0.42; this.list.push({ type: "shock", x, y, r: r0 || 10, vr: ((maxR || 160) - (r0 || 10)) / life, col: col || "#fff", thick: thick || 6, life, max: life });
  },
  smoke(x, y, col) {
    this.list.push({ type: "smoke", x: x + (Math.random() - 0.5) * 16, y, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 55, size: 9 + Math.random() * 13, col: col || "#33323a", life: 0.5 + Math.random() * 0.45, max: 0.95 });
  },
  // a full explosion: flash core + double shockwave + sparks + shards + embers + smoke.
  explode(x, y, col, scale) {
    scale = scale || 1;
    const low = (typeof GFX !== "undefined") && GFX.low;
    this.flash(x, y, 54 * scale, col);
    this.shockwave(x, y, 16 * scale, col, 175 * scale, 7 * scale);
    this.shockwave(x, y, 6 * scale, "#ffffff", 112 * scale, 3 * scale);
    this.burst(x, y, 0, -0.3, low ? 8 : Math.round(18 * scale), col);
    for (let i = 0; i < (low ? 4 : Math.round(9 * scale)); i++) this.shard(x, y, col);
    if (!low) { for (let i = 0; i < Math.round(5 * scale); i++) this.ember(x, y - 6, col); for (let i = 0; i < Math.round(3 * scale); i++) this.smoke(x, y - 4); }
  },

  // a fading silhouette (dash afterimage). col tints it (e.g. fire for Cinder Trail)
  ghost(x, y, hw, hh, col) {
    this.list.push({ type: "ghost", x, y, hw, hh, col: col || null, life: 0.22, max: 0.22 });
  },

  // a rising, flickering fire ember (burn / flame dash)
  ember(x, y, col) {
    this.list.push({
      type: "ember", x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 50, vy: -70 - Math.random() * 120,
      col: col || (Math.random() < 0.5 ? "#ff8a1e" : "#ffd23e"),
      size: 2.5 + Math.random() * 3.5, life: 0.35 + Math.random() * 0.35, max: 0.7,
    });
  },

  // a falling blood drip (bleed)
  drip(x, y, col) {
    this.list.push({
      type: "drip", x: x + (Math.random() - 0.5) * 10, y,
      vx: (Math.random() - 0.5) * 36, vy: 20 + Math.random() * 70,
      col: col || "#b81d1d", size: 3 + Math.random() * 3, life: 0.45 + Math.random() * 0.3, max: 0.75,
    });
  },

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      if (p.type === "spark") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 1300 * dt;   // gravity on sparks
        p.vx *= 0.9;
      } else if (p.type === "ring") {
        p.r += 820 * dt;
      } else if (p.type === "shard") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 1500 * dt; p.vx *= 0.92;
        p.rot += p.spin * dt;
      } else if (p.type === "ember") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy *= 0.97; p.vx *= 0.94;   // buoyant: coast upward, slowing
      } else if (p.type === "drip") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 680 * dt;             // gravity
      } else if (p.type === "shock") {
        p.r += p.vr * dt;
      } else if (p.type === "smoke") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy *= 0.96; p.vx *= 0.95; p.size += 26 * dt;   // rise + billow
      }
      // flash + ghosts just fade in place
    }
    this.list = this.list.filter((p) => p.life > 0);
  },

  draw(ctx) {
    for (const p of this.list) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      const col = p.col || "#000";
      if (p.type === "spark") {
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.018, p.y - p.vy * 0.018);
        ctx.stroke();
      } else if (p.type === "ring") {
        ctx.strokeStyle = col;
        ctx.lineWidth = 3 * a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === "shard") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = col;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.6); ctx.lineTo(-s * 0.7, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.type === "ghost") {
        ctx.globalAlpha = a * (p.col ? 0.5 : 0.35);
        ctx.fillStyle = p.col || "#000";
        ctx.fillRect(p.x - p.hw, p.y - p.hh, p.hw * 2, p.hh * 2);
      } else if (p.type === "ember") {
        ctx.globalAlpha = a * 0.95;
        ctx.fillStyle = col;
        const s = p.size * (0.5 + a * 0.5);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.type === "drip") {
        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.fillRect(p.x - 1.5, p.y - p.size, 3, p.size + 1);
      } else if (p.type === "flash") {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const rr = p.r * (1.4 - a * 0.4);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, col); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = a * 0.7; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (p.type === "shock") {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a * 0.85; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, p.thick * a);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (p.type === "smoke") {
        ctx.globalAlpha = a * 0.26; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },
};


// --- projectile.js ---
// ------- projectiles (enemy fire, deflectable) -------
class Projectile {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.r = CONFIG.proj.r;
    this.dead = false;
    this.deflected = false;   // once deflected, it hurts enemies instead of the player
    this.perfect = false;     // perfect parry: homed + bonus damage
    this.deflectDmg = 28;     // damage dealt to enemies after a deflect
    this.pierce = false;      // ability: passes through enemies
    this.pierced = null;      // set of enemies already hit (when piercing)
    this.bounces = 0;         // ability: ricochets off walls this many times
    this.life = 6;            // seconds before it expires
    this.dmg = null;          // override damage to the player (null = CONFIG.proj.dmg)
    this.charged = false;     // Marksman's heavy shot: big, slow, very parryable
    this.gravity = 0;         // arcing projectiles (bombs) fall under gravity
    this.bomb = false;        // explodes (AoE) on impact instead of a direct hit
    this.mine = false;        // settles on the floor, arms, then detonates on proximity
    this.armed = false;
    this.armT = 0;
    this.shock = false;       // armored stomp ground wave (jump it; non-parryable)
    this.curve = false;       // Warlock: redirects once toward the player mid-flight
    this.curveT = 0;          // ...countdown to that adjustment
    this.curved = false;
    this.root = 0;            // Chain: roots the player for this many seconds on hit
    this.mud = false;         // Sludge: lands and leaves a slowing puddle
    this.tint = null;         // shot colour, set by the firing enemy (else default enemyShot)
    this.kind = "dart";       // visual shape: "dart" (oriented bolt) | "orb" (caster)
    this.hist = [];           // recent positions -> a real motion trail for EVERY projectile
  }

  update(dt) {
    if (this.gravity) this.vy += this.gravity * dt;   // bombs arc; mines fall to the floor
    this.hist.push({ x: this.x, y: this.y });          // record the path for the motion trail
    if (this.hist.length > 7) this.hist.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;

    if (this.bounces > 0) {
      // ricochet off the play-area edges
      const r = this.r, W = CONFIG.view.w, top = 0, bottom = CONFIG.world.groundY;
      let hit = false;
      if (this.x < r) { this.x = r; this.vx = Math.abs(this.vx); hit = true; }
      else if (this.x > W - r) { this.x = W - r; this.vx = -Math.abs(this.vx); hit = true; }
      if (this.y < top + r) { this.y = top + r; this.vy = Math.abs(this.vy); hit = true; }
      else if (this.y > bottom - r) { this.y = bottom - r; this.vy = -Math.abs(this.vy); hit = true; }
      if (hit) {
        if (this.sweeper) { FX.ring(this.x, this.y, 6, CONFIG.colors.armoredShield); }   // sweeper keeps its speed forever
        else { this.bounces--; this.vx *= 0.85; this.vy *= 0.85; FX.ring(this.x, this.y, 4); }
      }
      return;
    }

    const m = 40;
    if (this.x < -m || this.x > CONFIG.view.w + m || this.y < -m || this.y > CONFIG.view.h + m) {
      this.dead = true;
    }
  }

  // reflect along a direction (blade travel, or toward a target for a perfect parry)
  deflect(dirX, dirY, speed, perfect) {
    const inSpeed = len(this.vx, this.vy) || CONFIG.proj.speed;   // the incoming shot's speed
    const m = len(dirX, dirY) || 1;
    const boost = perfect ? CONFIG.blade.deflectBoost * 1.6 : CONFIG.blade.deflectBoost;
    const s = Math.max(speed, CONFIG.proj.speed) * boost;
    this.vx = (dirX / m) * s;
    this.vy = (dirY / m) * s;
    this.deflected = true;
    this.perfect = !!perfect;
    // parry damage scales with BOTH the original shot's damage AND its speed — sending a
    // fast, heavy shot back is the big payoff; a slow pellet barely stings
    const orig = this.dmg != null ? this.dmg : CONFIG.proj.dmg;
    const speedF = clamp(inSpeed / 600, 0.6, 2.2);
    this.deflectDmg = Math.round((orig * (perfect ? 2.6 : 1.8) + (perfect ? 10 : 8)) * (0.7 + 0.3 * speedF));
    this.life = 6;
  }

  // a tapering, fading motion trail through the recent path — every projectile gets it
  _trail(ctx, col, dark, lowG) {
    const h = this.hist; if (lowG || h.length < 2) return;
    ctx.save();
    if (dark) ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = col; ctx.lineCap = "round";
    for (let i = 1; i < h.length; i++) {
      const k = i / h.length;
      ctx.globalAlpha = k * 0.5;
      ctx.lineWidth = this.r * 1.7 * k;
      ctx.beginPath(); ctx.moveTo(h[i - 1].x, h[i - 1].y); ctx.lineTo(h[i].x, h[i].y); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  draw(ctx) {
    const C = CONFIG.colors;
    const ink = (typeof THEME !== "undefined") ? THEME.ink : "#000";
    const dark = (typeof THEME !== "undefined") && THEME.dark;
    const lowG = (typeof GFX !== "undefined") && GFX.low;
    // universal motion trail (skipped only for the stationary mine once it settles)
    if (!(this.mine && this.armed)) {
      const tcol = this.deflected ? (this.perfect ? C.perfect : C.deflected) : (this.tint || (this.shock ? C.slam : this.mud ? C.sludge : this.bomb ? C.bomber : C.enemyShot));
      this._trail(ctx, tcol, dark, lowG);
    }
    if (this.sweeper) {                    // Colossus's thrown shield arm: a rotating bar of death
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(performance.now() / 200);
      if (!lowG) { ctx.shadowColor = C.armoredShield; ctx.shadowBlur = 12; }
      ctx.fillStyle = C.armoredShield; ctx.fillRect(-44, -9, 88, 18);
      ctx.shadowBlur = 0; ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.strokeRect(-44, -9, 88, 18);
      ctx.fillStyle = ink; ctx.fillRect(-6, -6, 12, 12);
      ctx.restore(); return;
    }
    if (this.shock) {                      // armored stomp shockwave: a ground spike you jump
      ctx.save();
      if (!lowG) { ctx.shadowColor = C.slam; ctx.shadowBlur = 10; }
      ctx.fillStyle = C.slam; ctx.globalAlpha = 0.92;
      ctx.beginPath(); ctx.moveTo(this.x - this.r, this.y + this.r);
      ctx.lineTo(this.x, this.y - this.r); ctx.lineTo(this.x + this.r, this.y + this.r);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore(); return;
    }
    if (this.mud && !this.deflected) {     // sludge glob in flight: a wobbling blob + drip
      const wob = Math.sin(performance.now() / 90) * 1.4;
      ctx.fillStyle = C.sludge; ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r + wob, this.r - wob, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = C.sludge; ctx.beginPath(); ctx.arc(this.x + this.r * 0.5, this.y - this.r * 0.4, this.r * 0.3, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (this.root && !this.deflected) {    // chain shot: two interlocked links, spinning
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(performance.now() / 260);
      ctx.strokeStyle = this.tint || C.enemyShot; ctx.lineWidth = 3.5;
      for (const o of [-this.r * 0.5, this.r * 0.5]) { ctx.beginPath(); ctx.ellipse(o, 0, this.r * 0.7, this.r * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore(); return;
    }
    if (this.mine) {                       // floor mine: disk + arming/armed blink
      ctx.fillStyle = this.deflected ? C.deflected : C.bomber;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
      const blink = this.armed ? (Math.floor(performance.now() / 140) % 2 === 0) : false;
      ctx.fillStyle = this.armed ? (blink ? C.charger : ink) : "#888";
      ctx.beginPath(); ctx.arc(this.x, this.y - 1, 2.5, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (this.bomb && !this.deflected) {    // lobbed bomb: impact-shadow telegraph + danger ring + sputtering fuse
      const gy = CONFIG.world.groundY, t = performance.now();
      // ground shadow under the bomb — grows as it falls, telegraphing the danger zone
      const fall = clamp(1 - (gy - this.y) / 460, 0.25, 1);
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.ellipse(this.x, gy - 3, 24 * fall, 6 * fall, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // pulsing danger ring
      const pulse = 0.5 + 0.5 * Math.sin(t / 110);
      ctx.save(); if (!lowG) { ctx.shadowColor = C.bomber; ctx.shadowBlur = 9; }
      ctx.strokeStyle = C.bomber; ctx.globalAlpha = 0.32 + 0.28 * pulse; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 6 + 3 * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      // body: dark sphere with a bomber-orange rim + seam
      ctx.save(); if (!lowG) { ctx.shadowColor = C.bomber; ctx.shadowBlur = dark ? 12 : 7; }
      ctx.fillStyle = C.bomber; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 0.45; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(this.x - this.r, this.y); ctx.lineTo(this.x + this.r, this.y);
      ctx.moveTo(this.x, this.y - this.r); ctx.lineTo(this.x, this.y + this.r); ctx.stroke(); ctx.restore();
      // sputtering fuse spark on top
      const fy = this.y - this.r - 5, fl = 0.55 + 0.45 * Math.sin(t / 38);
      ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.x, this.y - this.r); ctx.lineTo(this.x, fy); ctx.stroke();
      if (!lowG) { ctx.shadowColor = "#ffd23e"; ctx.shadowBlur = 10; }
      ctx.globalAlpha = fl; ctx.fillStyle = (Math.floor(t / 60) % 2) ? "#ffd23e" : "#ff8a1e";
      ctx.beginPath(); ctx.arc(this.x, fy, 2.5 + 1.6 * fl, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      return;
    }

    // --- generic shot: an oriented body with a comet trail, hot core, and soft glow ---
    const col = this.deflected ? (this.perfect ? C.perfect : C.deflected) : (this.tint || (this.bomb ? C.bomber : C.enemyShot));
    const m = len(this.vx, this.vy) || 1, ang = Math.atan2(this.vy, this.vx), r = this.r;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!lowG) { ctx.shadowColor = col; ctx.shadowBlur = dark ? 12 : 7; }
    ctx.rotate(ang);
    ctx.fillStyle = col; ctx.strokeStyle = ink; ctx.lineWidth = this.charged ? 2.5 : 1.5;
    if (this.kind === "orb" || this.bomb) {            // caster orb / bomb: round body
      const pr = this.bomb ? r : r * (1 + 0.12 * Math.sin(performance.now() / 120));
      ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
      if (this.kind === "orb") { ctx.strokeStyle = "#fff"; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, pr * 0.5, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    } else {                                            // streamlined dart, tip forward along travel
      const rx = r * (this.charged ? 1.8 : 1.5), ry = r * 0.92;
      ctx.beginPath(); ctx.moveTo(rx, 0);
      ctx.quadraticCurveTo(0, -ry, -rx * 0.7, -ry * 0.55);
      ctx.quadraticCurveTo(-rx * 0.9, 0, -rx * 0.7, ry * 0.55);
      ctx.quadraticCurveTo(0, ry, rx, 0);
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
    }
    // hot white core
    ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();

    if (this.bomb) { ctx.fillStyle = ink; ctx.fillRect(this.x - 1.5, this.y - r - 5, 3, 5); }   // fuse
    if (this.deflected) {                                // rings: it's yours now (double on a perfect parry)
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, r + 5, 0, Math.PI * 2); ctx.stroke();
      if (this.perfect) { ctx.beginPath(); ctx.arc(this.x, this.y, r + 9, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
}


// --- variants.js ---
// ------- enemy variants: distinct "evolutions" of each base family -------
// The ~35 named foes from the design docs don't need 35 classes. A FAMILY defines
// the verbs (Charger comes at you, Ranged makes you come to it, Flyer owns the air);
// a VARIANT reshapes those verbs into a distinct threat; AFFIXES (affixes.js) then
// tint/scale on top. So "Swift Armed Stalker" late-game reads nothing like a wave-1
// Charger, with no combinatorial class explosion.
//
// Each variant sets e.behavior (the AI branch its family.update() switches on) plus
// light stat tweaks. Variants are weighted and gated by wave so the roster unfolds
// as a run/campaign progresses.

const VARIANTS = {
  charger: [
    { id: "bull",        name: "Charger",     weight: 1.0,             apply: (e) => { e.behavior = "bull"; } },
    { id: "brawler",     name: "Brawler",     weight: 0.8, minWave: 2, apply: (e) => { e.behavior = "brawler"; e.contactReach = Math.max(e.contactReach, 10); } },
    { id: "stalker",     name: "Stalker",     weight: 0.7, minWave: 4, apply: (e) => { e.behavior = "stalker"; e.speedMult *= 1.3; e.hp *= 0.78; e.maxHp *= 0.78; } },
    { id: "executioner", name: "Executioner", weight: 0.5, minWave: 6, apply: (e) => { e.behavior = "executioner"; e.hp *= 1.3; e.maxHp *= 1.3; e.speedMult *= 0.7; } },
    { id: "gravedigger", name: "Gravedigger", weight: 0.5, minWave: 5, apply: (e) => { e.behavior = "gravedigger"; e.hp *= 1.4; e.maxHp *= 1.4; e.speedMult *= 0.6; } },
    { id: "duelist",     name: "Duelist",     weight: 0.5, minWave: 6, apply: (e) => { e.behavior = "duelist"; e.contactReach = Math.max(e.contactReach, 12); e.duelReady = true; } },
  ],
  ranged: [
    { id: "sentinel", name: "Sentinel", weight: 1.0,             apply: (e) => { e.behavior = "sentinel"; } },
    { id: "rifleman", name: "Rifleman", weight: 0.8, minWave: 3, apply: (e) => { e.behavior = "rifleman"; } },
    { id: "marksman", name: "Marksman", weight: 0.6, minWave: 5, apply: (e) => { e.behavior = "marksman"; e.hp *= 1.1; e.maxHp *= 1.1; } },
    { id: "warlock",  name: "Warlock",  weight: 0.55, minWave: 6, apply: (e) => { e.behavior = "warlock"; } },
    { id: "chain",    name: "Chain Caster", weight: 0.5, minWave: 7, apply: (e) => { e.behavior = "chain"; } },
  ],
  flyer: [
    { id: "swooper",    name: "Flyer",       weight: 1.0,             apply: (e) => { e.behavior = "swoop"; } },
    { id: "divebomber", name: "Dive Bomber", weight: 0.8, minWave: 3, apply: (e) => { e.behavior = "divebomb"; } },
    { id: "highdiver",  name: "Swooper",     weight: 0.6, minWave: 5, apply: (e) => { e.behavior = "highdive"; } },
  ],
  bomber: [
    { id: "lobber",    name: "Bomber",    weight: 1.0,             apply: (e) => { e.behavior = "lob"; } },
    { id: "juggler",   name: "Juggler",   weight: 0.7, minWave: 4, apply: (e) => { e.behavior = "juggle"; } },
    { id: "trapper",   name: "Trapper",   weight: 0.6, minWave: 3, apply: (e) => { e.behavior = "trap"; } },
    { id: "sludge",    name: "Sludge",    weight: 0.5, minWave: 5, apply: (e) => { e.behavior = "sludge"; } },
    { id: "geomancer", name: "Geomancer", weight: 0.45, minWave: 7, apply: (e) => { e.behavior = "geo"; e.hp *= 1.2; e.maxHp *= 1.2; } },
  ],
  // armored keeps its baseline (turn-to-face + enrage on shield break); an absent
  // list just means "no variant, use the family default".
};

// weighted pick among the eligible variants for a kind at this wave
function rollVariant(kind, wave) {
  const list = (VARIANTS[kind] || []).filter((v) => !v.minWave || wave >= v.minWave);
  if (!list.length) return null;
  let total = 0; for (const v of list) total += v.weight;
  let r = Math.random() * total;
  for (const v of list) { if ((r -= v.weight) <= 0) return v; }
  return list[0];
}

function applyVariant(e, v) {
  if (!v) return;
  e.variant = v.id;
  e.variantName = v.name;
  v.apply(e);
}


// --- enemy.js ---
// ------- enemies: shared base + Charger, Ranged, Flyer, Bomber, Armored, Boss -------
class Enemy {
  constructor(x, y, cfg) {
    this.cfg = cfg;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hw = cfg.w / 2;
    this.hh = cfg.h / 2;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.hpDisplay = cfg.hp;   // lagging bar for the drain effect
    this.onGround = false;
    this.dead = false;
    this.hitCd = 0;
    this.flash = 0;
    this.stun = 0;
    this.speedMult = 1;
    this.contactDmg = cfg.contactDmg;
    this.elite = false;
    this.color = "#000";
    this.spawnT = 0;       // >0 while materializing (telegraph + can't act)
    this.weight = cfg.weight || 1;   // resists launches (heavier = less pop)
    this.spiked = false;   // slammed downward while airborne -> ground-impact on landing
    // variant / affix state
    this.kind = "enemy";
    this.variant = "";       // distinct "evolution" within the family (variants.js)
    this.variantName = "";
    this.behavior = "";      // AI branch the family.update() switches on
    this.affixes = [];
    this.affixCount = 0;
    this.fireRateMult = 1; // <1 = shoots faster (Rapid)
    this.volley = 1;       // shots per attack (Volley)
    this.contactReach = 0; // extra contact range (Armed)
    this.shield = 0;       // absorbs damage before HP (Warded)
    this.maxShield = 0;
    this.canJump = false;  // some ground enemies can hop onto platforms
    this.jumpCd = 0;
    // generic melee attack state machine (bull charge / brawler punch / stalker)
    this.atk = "idle";     // idle | windup | commit | recover
    this.atkT = 0;         // timer within the current attack phase
    this.atkCd = 0;        // recovery before the next attack
    this.atkDir = 1;       // committed horizontal direction
    this.feint = false;    // this windup is a feint (brawler bluffs, then backs off)
    this.enraged = false;  // armored: shield broken -> faster & aggressive
    this.evadeCd = 0;      // stalker: cooldown between dash-reads
    this.atkMax = 0;       // duration of the current wind-up (for telegraph scaling)
    this.weaponA = -0.5;   // animated weapon angle (radians; -up, 0 forward, +down)
    this.weaponPrevA = -0.5;
    this.chargePower = 0;  // 0..1 roll: longer wind-up -> farther, harder charge
    this.chargeMult = 1;   // contact-damage multiplier applied during a committed charge
    // platform pathfinding
    this.canClimb = false; // family is capable of hopping platforms
    this.climber = false;  // ...and this individual actually does (rolled at spawn)
    this.climbApt = 0.5;   // aptitude 0..1: better climbers react sooner & hop more fluidly
    this.navDir = 1;       // suggested horizontal direction from climbNav
    this.perchT = 0;       // how long the player has been perched above & unreached
    this.climbCommit = 0;  // once it decides to climb, it commits for a stretch (anti-jitter)
    this.aliveT = 0;       // seconds alive — willingness to climb ramps with this
    // support auras (re-applied each frame by updateSupports in game.js)
    this.auraDR = 1;       // War Priest: incoming damage multiplier (<1 = protected)
    this.auraDmg = 1;      // War Priest: outgoing damage multiplier (>1 = empowered)
    this.auraSpeed = 1;    // Herald: movement-speed multiplier
    this.auraHaste = 1;    // Herald: attack-cadence multiplier (>1 = faster shots/attacks)
    this.tetherDR = 1;     // Anchor: shielded ally damage multiplier
    this.anchored = false; // Anchor: bonded ally can't be knocked back / launched
    this.buffs = [];       // which support types currently affect this enemy (for indicators)
    this.immuneToBlade = false;  // Wraith: direct blade hits pass through harmlessly
    // ---- status effects (from Special abilities) ----
    this.bleedStacks = 0; this.bleedT = 0;   // BLEED: stacking damage-over-time
    this.burnT = 0; this.burnDps = 0;         // BURN: flat damage-over-time
    this.markT = 0;                            // MARK: takes +damage from everything
    this.slowStatus = 1;                       // Cinder T2: chilled/slowed while burning
    this._stFx = 0;                            // throttle for status particles
  }

  // ---- status effects ----
  applyBleed(stacks) { const S = CONFIG.status; this.bleedStacks = Math.min(S.bleedMax, this.bleedStacks + stacks); this.bleedT = S.bleedDur; }
  applyBurn() { const S = CONFIG.status; this.burnT = Math.max(this.burnT, S.burnDur); this.burnDps = Math.max(this.burnDps, S.burnDps); }
  applyMark() { this.markT = Math.max(this.markT, CONFIG.status.markDur); }
  bleedPool() { return this.bleedStacks * CONFIG.status.bleedDps * Math.max(this.bleedT, 0); }   // remaining bleed if it ran out
  detonateBleed() { const d = this.bleedPool(); this.bleedStacks = 0; this.bleedT = 0; if (d > 0) this._dot(d); return d; }
  _dot(dmg) {   // damage with no i-frame / knockback (used by DoTs + detonations)
    if (this.shield > 0) { this.shield -= dmg; if (this.shield < 0) { this.hp += this.shield; this.shield = 0; } }
    else this.hp -= dmg;
    if (this.hp <= 0) {
      if (this._deathLocked()) { this.hp = 1; }   // scripted-invulnerable boss phase (fake-death): DoTs can't kill either
      else { this.dead = true; if (this.isBoss && typeof Clipper !== 'undefined') Clipper.stop(); }
    }
  }
  // bosses override: true while in a scripted fake-death/kneel phase where NO damage path
  // (blade hit OR DoT) may be lethal — the fight must reach the scripted revival.
  _deathLocked() { return false; }
  // returns damage dealt this tick (so the loop can credit DoT kills)
  tickStatus(dt) {
    let dealt = 0;
    if (this.markT > 0) this.markT -= dt;
    if (this.bleedStacks > 0) {
      this.bleedT -= dt;
      if (this.bleedT <= 0) { this.bleedStacks = 0; this.bleedT = 0; }
      else { const d = this.bleedStacks * CONFIG.status.bleedDps * dt; this._dot(d); dealt += d; }
    }
    if (this.burnT > 0) { this.burnT -= dt; const d = this.burnDps * dt; this._dot(d); dealt += d; if (this.burnT <= 0) this.burnDps = 0; }
    return dealt;
  }

  get radius() { return Math.max(this.hw, this.hh); }
  get speed() { return this.cfg.speed * this.speedMult * this.auraSpeed * this.slowStatus; }
  blocks() { return false; }            // armored overrides
  damageTakenMult() { return 1; }       // armored overrides (ground vs air)

  // turn this into a tougher elite variant
  makeElite() {
    const E = CONFIG.elite;
    this.elite = true;
    this.hp *= E.hpMult; this.maxHp *= E.hpMult;
    this.speedMult *= E.speedMult;
    this.contactDmg *= E.dmgMult;
    this.hw *= E.sizeMult; this.hh *= E.sizeMult;
  }

  integrate(dt, platforms) {
    this.vx = clamp(this.vx, -1200, 1200);   // safety: knockback can never fling across the map
    this.vy += CONFIG.world.gravity * dt;
    if (this.vy > CONFIG.player.maxFall) this.vy = CONFIG.player.maxFall;
    this.x += this.vx * dt;
    this._collideAxis(platforms, true, 0);
    const prevBottom = this.y + this.hh;
    this.y += this.vy * dt;
    this.onGround = false;
    this._collideAxis(platforms, false, prevBottom);
    this.x = clamp(this.x, this.hw, CONFIG.view.w - this.hw);
    if (this.y < this.hh) this.y = this.hh;   // never leave the top of the arena (stay killable)
    // hard floor: never sink below the floor surface (failsafe vs phasing through it)
    const floorTop = CONFIG.world.groundY - this.hh;
    if (this.y > floorTop) { this.y = floorTop; this.vy = 0; this.onGround = true; }
  }

  _collideAxis(platforms, horizontal, prevBottom) {
    for (const p of platforms) {
      if (p.oneway) {
        // one-way: land only when actually crossing THIS platform's top from above
        // (must be above last frame AND at/through the top now) — prevents snapping
        // down onto a lower platform that merely overlaps in x.
        if (horizontal) continue;
        if (this.vy >= 0 && prevBottom <= p.y + 1.5 && this.y + this.hh >= p.y &&
            this.x + this.hw > p.x && this.x - this.hw < p.x + p.w) {
          this.y = p.y - this.hh; this.vy = 0; this.onGround = true;
        }
        continue;
      }
      if (horizontal && p.floor) continue;   // the full-width floor never blocks horizontal movement
      const phw = p.w / 2, phh = p.h / 2;
      const pcx = p.x + phw, pcy = p.y + phh;
      if (!aabbOverlap(this.x, this.y, this.hw, this.hh, pcx, pcy, phw, phh)) continue;
      if (horizontal) {
        if (this.vx > 0) this.x = pcx - phw - this.hw;
        else if (this.vx < 0) this.x = pcx + phw + this.hw;
        this.vx = 0;
      } else {
        if (this.vy > 0) { this.y = pcy - phh - this.hh; this.onGround = true; }
        else if (this.vy < 0) this.y = pcy + phh + this.hh;
        this.vy = 0;
      }
    }
  }

  // some grounded enemies hop toward the player when they're up on a platform
  maybeJump(player, dt) {
    if (this.jumpCd > 0) this.jumpCd -= dt;
    if (!this.canJump || !this.onGround || this.jumpCd > 0) return;
    if (player.y < this.y - 90 && Math.random() < 0.5) { this.vy = -1100; this.onGround = false; this.jumpCd = 1.8; }
  }

  // lightweight platform pathfinding: when the player is perched above, steer toward
  // the nearest reachable one-way platform and hop onto it, level-by-level. NOT every
  // enemy climbs, and the ones that do don't react instantly — they need the player to
  // stay perched for a "react delay" that shrinks the longer the enemy has been alive
  // (rookies stay grounded; lingering enemies get determined) and with its aptitude.
  // A commitment window stops per-frame jitter, so a player drifting across platforms
  // doesn't turn the whole arena into a jumping fest. Returns true while it's climbing.
  climbNav(player, platforms, dt) {
    if (this.jumpCd > 0) this.jumpCd -= dt;
    this.navDir = Math.sign(player.x - this.x) || 1;
    const feetY = this.y + this.hh, playerFeet = player.y + player.hh;
    const above = playerFeet <= this.y - 60;
    if (above) this.perchT += dt; else { this.perchT = 0; this.climbCommit = 0; }
    if (!this.canClimb || !this.climber || !above) return false;

    // willingness ramps with time alive; the perch delay before reacting shrinks with
    // age + aptitude (so freshly spawned enemies don't all leap the instant you hop up)
    const will = clamp(this.aliveT / 14, 0, 1);
    const reactDelay = lerp(2.4, 0.45, will * 0.6 + this.climbApt * 0.4);
    if (this.climbCommit <= 0 && this.perchT < reactDelay) return false;
    if (this.climbCommit <= 0) this.climbCommit = 1.6;     // commit a stretch (anti-jitter)
    this.climbCommit -= dt;

    const MAXJUMP = 300, TOL = 130;
    let best = null, bestDist = Infinity;
    for (const p of platforms) {
      if (!p.oneway) continue;
      if (p.y >= feetY - 30) continue;                 // must be above us
      if (feetY - p.y > MAXJUMP) continue;             // too high to reach in one hop
      if (p.y < playerFeet - 50) continue;             // don't climb above the player
      const d = Math.abs((p.x + p.w / 2) - this.x);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    if (!best) return false;                            // nothing reachable -> gather underneath
    const center = best.x + best.w / 2;
    if (this.x > best.x - TOL && this.x < best.x + best.w + TOL) {
      this.navDir = Math.sign(center - this.x) || this.navDir;
      if (this.onGround && this.jumpCd <= 0) {          // aligned -> hop up (and across) onto it
        this.vy = -1250; this.onGround = false;
        this.jumpCd = lerp(1.5, 0.7, this.climbApt);    // clumsy climbers hesitate between hops
        this.vx += Math.sign(center - this.x) * 320;
      }
    } else {
      this.navDir = Math.sign(center - this.x) || 1;    // walk under it first
    }
    return true;
  }

  fireAt(player, projectiles, speed) {
    const dx = player.x - this.x, dy = player.y - this.y;
    const m = len(dx, dy) || 1;
    const p = new Projectile(this.x, this.y, (dx / m) * speed, (dy / m) * speed);
    p.dmg = CONFIG.proj.dmg * this.auraDmg;   // War Priest empowers shots
    p.tint = this.color; projectiles.push(p);
  }

  tickTimers(dt) {
    this.aliveT += dt;
    if (this.hitCd > 0) this.hitCd -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.stun > 0) this.stun -= dt;
    if (this.hpDisplay > this.hp) this.hpDisplay += (this.hp - this.hpDisplay) * clamp(7 * dt, 0, 1);
  }

  hit(dmg, knockX, knockY) {
    this.hitCd = CONFIG.blade.enemyHitIframe;
    this.flash = 0.08;
    dmg *= this.auraDR * this.tetherDR;          // War Priest / Anchor protection
    if (this.markT > 0) dmg *= CONFIG.status.markMult;   // MARK: amplifies every hit
    if (this.shield > 0) {                       // Warded: shield absorbs first
      this.shield -= dmg;
      if (this.shield < 0) { this.hp += this.shield; this.shield = 0; }
    } else {
      this.hp -= dmg;
    }
    if (!this.anchored) {   // an Anchor's bonded ally is immovable until the Anchor dies
      const kb = dmg * this.cfg.knockbackTaken / this.weight;
      const m = len(knockX, knockY) || 1;
      this.vx += (knockX / m) * kb;
      this.vy += (knockY / m) * kb - 120 / this.weight;
    }
    if (this.hp <= 0) {
      if (this._deathLocked()) { this.hp = 1; }   // scripted-invulnerable boss phase: a blade hit can't kill here either
      else { this.dead = true; if (this.isBoss && typeof Clipper !== 'undefined') Clipper.stop(); }
    }
  }

  // additive shim: a uniform damage entrypoint for a symmetric actor-vs-actor collision loop
  // (see Mirror). One-line alias into the existing hit() — no existing call site changes.
  takeHit(dmg, kx, ky, src) { this.hit(dmg, kx, ky); return this.dead ? "dead" : "hit"; }

  drawHpBar(ctx) {
    if (this._noBar) return;                                  // suppressed (e.g. INDEX previews)
    const fr = clamp(this.hp / this.maxHp, 0, 1);
    const shielded = this.maxShield > 0 && this.shield > 0;
    const status = this.bleedStacks > 0 || this.burnT > 0 || this.markT > 0;
    const hit = clamp((this.flash || 0) / 0.08, 0, 1);        // 1 right after a hit -> 0
    if (fr >= 1 && !shielded && hit <= 0 && !status) return;  // pristine & unhurt -> no bar (less clutter)
    const w = Math.max(this.hw * 2, 28), x = this.x - w / 2, y = this.y - this.hh - 15, h = 5, cy = y + h / 2;
    const fl = clamp(this.hpDisplay / this.maxHp, 0, 1), low = fr <= 0.3;
    ctx.save();
    if (hit > 0) { ctx.translate(this.x, cy); ctx.scale(1 + hit * 0.05, 1 + hit * 0.45); ctx.translate(-this.x, -cy); }  // swell on hit
    ctx.fillStyle = "rgba(0,0,0,0.82)"; ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);   // outline
    ctx.fillStyle = "#39343f"; ctx.fillRect(x, y, w, h);                                // track
    if (fl > fr) { ctx.fillStyle = CONFIG.colors.slam; ctx.fillRect(x + w * fr, y, w * (fl - fr), h); }  // lagging damage chip
    ctx.fillStyle = low ? CONFIG.colors.charger : "#fff"; ctx.fillRect(x, y, w * fr, h);                 // current hp (warns red when low)
    if (hit > 0) { ctx.globalAlpha = hit * 0.7; ctx.fillStyle = "#fff"; ctx.fillRect(x, y, w * fr, h); ctx.globalAlpha = 1; }  // hit flash
    ctx.fillStyle = low ? CONFIG.colors.charger : CONFIG.colors.eye; ctx.fillRect(x + w * fr - 1.5, y - 1, 2.5, h + 2);        // bright leading edge
    if (shielded) { ctx.fillStyle = CONFIG.colors.perfect; ctx.fillRect(x, y - 5, w * clamp(this.shield / this.maxShield, 0, 1), 3); }  // warded shield
    // status pips above the bar (bleed / burn / mark)
    if (status) {
      let sx = x; const sy = y - (shielded ? 9 : 5) - 4;
      if (this.bleedStacks > 0) { ctx.fillStyle = CONFIG.colors.charger; ctx.fillRect(sx, sy, 4, 4); sx += 6; }
      if (this.burnT > 0) { ctx.fillStyle = CONFIG.colors.slam; ctx.fillRect(sx, sy, 4, 4); sx += 6; }
      if (this.markT > 0) { ctx.fillStyle = CONFIG.colors.eye; ctx.fillRect(sx, sy, 4, 4); }
    }
    ctx.restore();
  }
}

// ---- Melee family: Charger (bull-rush), Brawler (spacing + punch/feint), Stalker (reads your dash) ----
class Charger extends Enemy {
  constructor(x, y) { super(x, y, CONFIG.enemy); this.color = CONFIG.colors.charger; this.kind = "charger"; this.behavior = "bull"; }

  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    if (this.atkCd > 0) this.atkCd -= dt;
    this._animWeapon(dt);
    // a wound-up charge hits harder on contact (longer wind-up = more power)
    this.chargeMult = (this.behavior === "bull" && this.atk === "commit") ? (1 + this.chargePower) : 1;
    // Duelist parry recharge
    if (this.behavior === "duelist" && this.duelCd > 0) { this.duelCd -= dt; if (this.duelCd <= 0) this.duelReady = true; }

    // pathfind up to a perched player (never interrupt an in-progress charge)
    if (this.canClimb && this.atk !== "commit" && this.atk !== "swing" && this.climbNav(player, platforms, dt)) {
      if (this.onGround) this.vx = lerp(this.vx, this.navDir * this.speed * 1.1, clamp(7 * dt, 0, 1));
      this.atk = "idle";
      this.integrate(dt, platforms);
      return;
    }

    const E = CONFIG.enemy;
    const dx = player.x - this.x, dist = Math.abs(dx), dir = Math.sign(dx) || 1;

    if (this.behavior === "brawler" || this.behavior === "duelist") this._brawler(dt, player, dist, dir);
    else if (this.behavior === "stalker") this._stalker(dt, player, dist, dir, E);
    else if (this.behavior === "executioner") this._executioner(dt, player, dist, dir, projectiles);
    else if (this.behavior === "gravedigger") this._gravedigger(dt, player, dist, dir, projectiles);
    else this._bull(dt, player, dist, dir, E);

    const preVx = this.vx;
    this.integrate(dt, platforms);

    // a committed charge (bull / stalker) that slams a wall or the arena edge stuns
    // itself — that's the punish window the design wants.
    if (this.atk === "commit" && this.behavior !== "brawler") {
      const atEdge = this.x <= this.hw + 1 || this.x >= CONFIG.view.w - this.hw - 1;
      if ((this.vx === 0 && Math.abs(preVx) > 200) || atEdge) {
        this.stun = E.chargeStun; this.atk = "recover"; this.atkCd = E.chargeCd;
        FX.burst(this.x + this.atkDir * this.hw, this.y, this.atkDir, 0, 7, this.color);
      }
    }
  }

  _bull(dt, player, dist, dir, E) {
    switch (this.atk) {
      case "windup":
        this.vx = lerp(this.vx, 0, clamp(10 * dt, 0, 1));   // plant feet, telegraph
        this.atkDir = dir;                                   // can still adjust before committing
        this.atkT -= dt;
        if (this.atkT <= 0) {
          this.atk = "commit";
          this.atkT = E.chargeTime * (0.7 + this.chargePower);          // longer wind-up -> farther charge
          this.vx = this.atkDir * E.chargeSpeed * (0.9 + this.chargePower * 0.4);
        }
        break;
      case "commit":
        this.vx = this.atkDir * E.chargeSpeed * (0.9 + this.chargePower * 0.4);  // fixed line -> sidesteppable
        this.atkT -= dt;
        if (this.atkT <= 0) { this.atk = "recover"; this.atkCd = E.chargeCd / this.auraHaste; }   // Herald hastens
        break;
      case "recover":
        this.vx = lerp(this.vx, 0, clamp(6 * dt, 0, 1));
        if (this.atkCd <= 0) this.atk = "idle";
        break;
      default: // idle: stalk forward at a wary pace, then commit to a charge of varied power
        this.vx = lerp(this.vx, dir * this.speed, clamp(6 * dt, 0, 1));
        if (dist < E.chargeRange && this.atkCd <= 0 && Math.abs(player.y - this.y) < 150) {
          this.chargePower = Math.random();
          this.atk = "windup"; this.atkT = E.chargeWindup * (0.6 + this.chargePower); this.atkMax = this.atkT; this.atkDir = dir;
        }
    }
  }

  _brawler(dt, player, dist, dir) {
    const STAND = 130, LUNGE = 540;
    switch (this.atk) {
      case "windup":
        this.vx = lerp(this.vx, 0, clamp(12 * dt, 0, 1)); this.atkT -= dt;
        if (this.atkT <= 0) {
          if (this.feint) { this.atk = "recover"; this.atkCd = 0.7; this.vx = -this.atkDir * 280; } // bluff, hop back
          else { this.atk = "commit"; this.atkT = 0.2; this.vx = this.atkDir * LUNGE; }              // committed punch
        }
        break;
      case "commit":
        this.atkT -= dt;
        if (this.atkT <= 0) { this.atk = "recover"; this.atkCd = 0.9; }
        break;
      case "recover":
        this.vx = lerp(this.vx, 0, clamp(8 * dt, 0, 1));
        if (this.atkCd <= 0) this.atk = "idle";
        break;
      default: { // hold spacing, then telegraph a punch (sometimes a feint)
        let move = 0;
        if (dist > STAND + 30) move = dir; else if (dist < STAND - 40) move = -dir;
        this.vx = lerp(this.vx, move * this.speed * 1.1, clamp(6 * dt, 0, 1));
        if (dist < STAND + 60 && this.atkCd <= 0 && Math.abs(player.y - this.y) < 110) {
          this.atk = "windup"; this.atkT = 0.4; this.atkDir = dir; this.feint = Math.random() < 0.3;
        }
      }
    }
  }

  _stalker(dt, player, dist, dir, E) {
    if (this.evadeCd > 0) this.evadeCd -= dt;
    // read the dash: if the player dashes toward us up close, sidestep through it
    if (player.dashTimer > 0 && Math.sign(player.dashX) === dir && dist < 240 && this.evadeCd <= 0 && this.onGround) {
      this.vx = -dir * 740; this.vy = -560; this.evadeCd = 1.4; this.atk = "recover"; this.atkCd = 0.4;
      FX.burst(this.x, this.y, -dir, -1, 5, this.color);
      return;
    }
    const FAST = E.chargeSpeed * 0.95;
    switch (this.atk) {
      case "windup":
        this.vx = lerp(this.vx, 0, clamp(11 * dt, 0, 1)); this.atkDir = dir; this.atkT -= dt;
        if (this.atkT <= 0) { this.atk = "commit"; this.atkT = 0.4; this.vx = this.atkDir * FAST; }
        break;
      case "commit":
        this.vx = this.atkDir * FAST; this.atkT -= dt;
        if (this.atkT <= 0) { this.atk = "recover"; this.atkCd = 0.85; }
        break;
      case "recover":
        this.vx = lerp(this.vx, 0, clamp(8 * dt, 0, 1));
        if (this.atkCd <= 0) this.atk = "idle";
        break;
      default:
        this.vx = lerp(this.vx, dir * this.speed, clamp(8 * dt, 0, 1));
        if (dist < 300 && this.atkCd <= 0) { this.atk = "windup"; this.atkT = 0.28; this.atkDir = dir; }
    }
  }

  // Executioner: a long overhead wind-up (huge punish window) then heavy shockwaves both ways
  _executioner(dt, player, dist, dir, projectiles) {
    const X = CONFIG.exotic;
    if (this.atk === "windup") {
      this.vx = lerp(this.vx, 0, clamp(8 * dt, 0, 1)); this.atkDir = dir; this.atkT -= dt;
      if (this.atkT <= 0) {
        const footY = this.y + this.hh;
        for (const d of [-1, 1]) { const p = new Projectile(this.x + d * this.hw, footY - X.exShockR, d * X.exShockSpeed, 0); p.shock = true; p.r = X.exShockR; p.dmg = X.exShockDmg; p.life = 1.6; projectiles.push(p); }
        FX.ring(this.x, footY, 18, CONFIG.colors.slam); FX.burst(this.x, footY, 0, -1, 11, CONFIG.colors.charger);
        if (typeof SFX !== "undefined" && SFX.ctx && SFX.slam) SFX.slam();
        this.atk = "recover"; this.atkCd = 1.5;
      }
    } else if (this.atk === "recover") {
      this.vx = lerp(this.vx, 0, clamp(6 * dt, 0, 1)); if (this.atkCd <= 0) this.atk = "idle";
    } else {
      this.vx = lerp(this.vx, dir * this.speed, clamp(5 * dt, 0, 1));
      if (dist < 360 && this.atkCd <= 0 && Math.abs(player.y - this.y) < 130) { this.atk = "windup"; this.atkT = X.exWindup; this.atkMax = X.exWindup; this.atkDir = dir; }
    }
  }

  // Gravedigger: a wide swing whose shock starts out at mid-range — so getting INSIDE (point-
  // blank) is the safe play, and staying at mid-range is where it hits
  _gravedigger(dt, player, dist, dir, projectiles) {
    const X = CONFIG.exotic;
    if (this.atk === "windup") {
      this.vx = lerp(this.vx, 0, clamp(7 * dt, 0, 1)); this.atkDir = dir; this.atkT -= dt;
      if (this.atkT <= 0) {
        const footY = this.y + this.hh, sx = this.x + this.atkDir * X.gravReach;
        const p = new Projectile(sx, footY - X.gravShockR, this.atkDir * X.gravShockSpeed, 0);
        p.shock = true; p.r = X.gravShockR; p.dmg = X.gravDmg; p.life = 1.3; projectiles.push(p);
        FX.burst(sx, footY, 0, -1, 9, CONFIG.colors.charger);
        this.atk = "swing"; this.atkT = 0.25;
      }
    } else if (this.atk === "swing") {
      this.atkT -= dt; if (this.atkT <= 0) { this.atk = "recover"; this.atkCd = 1.5; }
    } else if (this.atk === "recover") {
      this.vx = lerp(this.vx, 0, clamp(5 * dt, 0, 1)); if (this.atkCd <= 0) this.atk = "idle";
    } else {
      this.vx = lerp(this.vx, dir * this.speed, clamp(4 * dt, 0, 1));
      if (dist < 330 && dist > 80 && this.atkCd <= 0 && Math.abs(player.y - this.y) < 120) { this.atk = "windup"; this.atkT = X.gravWindup; this.atkMax = X.gravWindup; this.atkDir = dir; }
    }
  }

  // swing the held weapon toward a target angle per attack state (cock back -> slam through)
  _animWeapon(dt) {
    let wt = -0.5, k = 9;                                // idle: held at the ready
    if (this.atk === "windup") { wt = -1.55; k = 11; }   // cock it back
    else if (this.atk === "commit" || this.atk === "strike" || this.atk === "swing") { wt = 0.78; k = 26; }  // slam through
    this.weaponPrevA = this.weaponA;
    this.weaponA = lerp(this.weaponA, wt, clamp(k * dt, 0, 1));
  }

  // draw an animated weapon (per variant) with a swoosh trail while it's swinging
  _drawWeapon(ctx, dir) {
    let type = null;
    if (this.behavior === "gravedigger") type = "shovel";
    else if (this.behavior === "executioner") type = "axe";
    else if (this.behavior === "duelist") type = "sword";
    else if (this.contactReach > 14) type = "club";
    if (!type) return;
    const hx = this.x + dir * this.hw * 0.5, hy = this.y - 2;
    const len = type === "shovel" ? 54 : type === "axe" ? 48 : Math.max(28, this.hw + this.contactReach);
    const a = this.weaponA, tx = hx + dir * Math.cos(a) * len, ty = hy + Math.sin(a) * len;
    // swoosh wedge between the previous and current angle while swinging fast
    if (Math.abs(this.weaponA - this.weaponPrevA) > 0.05) {
      ctx.fillStyle = CONFIG.colors.bladeTrail; ctx.globalAlpha = 0.28;
      ctx.beginPath(); ctx.moveTo(hx, hy);
      for (let s = 0; s <= 1; s += 0.2) { const aa = this.weaponPrevA + (a - this.weaponPrevA) * s; ctx.lineTo(hx + dir * Math.cos(aa) * len, hy + Math.sin(aa) * len); }
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = THEME.ink; ctx.lineCap = "round"; ctx.lineWidth = type === "club" ? 6 : 5;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.atan2(ty - hy, tx - hx)); ctx.fillStyle = THEME.ink;
    if (type === "axe") { ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(11, -13); ctx.lineTo(13, 0); ctx.lineTo(11, 13); ctx.lineTo(-4, 2); ctx.closePath(); ctx.fill(); }
    else if (type === "shovel") { ctx.fillRect(-2, -11, 15, 22); }
    else if (type === "club") { ctx.beginPath(); ctx.arc(5, 0, 8, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillRect(0, -2.5, 18, 5); }   // sword: extend the blade
    ctx.restore();
  }

  draw(ctx) {
    const x = this.x - this.hw, y = this.y - this.hh, w = this.hw * 2, h = this.hh * 2;
    const dir = this.atkDir || Math.sign(this.vx) || 1;

    // Executioner: an overhead slam warning (ground lines both sides + rising marker)
    if (this.behavior === "executioner" && this.atk === "windup") {
      const k = 1 - clamp(this.atkT / (this.atkMax || 1), 0, 1), gy = this.y + this.hh;
      ctx.strokeStyle = CONFIG.colors.slam; ctx.globalAlpha = 0.3 + 0.55 * k; ctx.lineWidth = 3 + k * 4;
      ctx.beginPath(); ctx.moveTo(this.x - (50 + 150 * k), gy - 2); ctx.lineTo(this.x + (50 + 150 * k), gy - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x, y - 8 - 30 * k); ctx.lineTo(this.x, y - 6); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Gravedigger: a wide arc telegraph out at mid-range (point-blank is safe)
    if (this.behavior === "gravedigger" && (this.atk === "windup" || this.atk === "swing")) {
      const k = this.atk === "swing" ? 1 : 1 - clamp(this.atkT / (this.atkMax || 1), 0, 1);
      const sx = this.x + this.atkDir * CONFIG.exotic.gravReach, gy = this.y + this.hh;
      ctx.strokeStyle = CONFIG.colors.slam; ctx.globalAlpha = 0.3 + 0.5 * k; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(sx, gy, 26 + 30 * k, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // bull charge wind-up telegraph: a building dashed arrow — longer/thicker for a
    // higher-power (longer wind-up) charge, so you can read how hard it's coming
    if (this.behavior === "bull" && this.atk === "windup" && !this.feint) {
      const k = 1 - clamp(this.atkT / (this.atkMax || 0.55), 0, 1);
      const reach = 40 + (60 + this.chargePower * 130) * k;
      ctx.strokeStyle = this.color; ctx.globalAlpha = 0.35 + 0.45 * k; ctx.lineWidth = 3 + this.chargePower * 2; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.atkDir * reach, this.y); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }

    ctx.fillStyle = this.flash > 0 ? "#fff" : (this.stun > 0 ? "#d7b3b3" : this.color);
    const _rim = !(typeof GFX !== "undefined" && GFX.low);
    if (_rim) { ctx.shadowColor = THEME.rim; ctx.shadowBlur = 6; }   // separating halo (esp. dark-bodied enemies on dark biomes)
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);

    // variant accents
    if (this.behavior === "bull") {                 // horns
      ctx.fillStyle = THEME.ink;
      ctx.fillRect(x + 2, y - 6, 5, 6); ctx.fillRect(x + w - 7, y - 6, 5, 6);
    } else if (this.behavior === "stalker") {        // shoulder spikes
      ctx.fillStyle = THEME.ink;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 6); ctx.lineTo(x, y + 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + 6, y + 6); ctx.lineTo(x + w, y + 10); ctx.fill();
    }

    // eye (x-ed out while stunned)
    ctx.fillStyle = "#fff";
    if (this.stun > 0) { ctx.fillStyle = THEME.ink; ctx.font = UI.font(11, true); ctx.textAlign = "center"; ctx.fillText("x x", this.x, y + 16); }
    else ctx.fillRect(this.x + dir * 7 - 3, y + 11, 6, 6);

    // brawler fists (cock back on windup, extend on the punch)
    if (this.behavior === "brawler") {
      ctx.fillStyle = THEME.ink;
      const ext = this.atk === "commit" ? 12 : (this.atk === "windup" ? -3 : 4);
      ctx.fillRect(this.x + dir * (this.hw + ext) - 4, this.y - 3, 8, 9);
    }

    // animated weapon (Armed club, Gravedigger shovel, Executioner axe, Duelist sword)
    this._drawWeapon(ctx, dir);
    this.drawHpBar(ctx);
  }
}

// ---- Ranged: kites, telegraphs, fires ----
class Ranged extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.ranged);
    this.color = CONFIG.colors.ranged;
    this.kind = "ranged";
    this.state = "kite";
    this.aimTimer = this.cfg.aimInterval * (0.4 + Math.random() * 0.6);
    this.windT = 0;
  }
  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    // reposition up to a perched player (hold fire while climbing)
    if (this.canClimb && this.state !== "windup" && this.climbNav(player, platforms, dt)) {
      if (this.onGround) this.vx = lerp(this.vx, this.navDir * this.speed, clamp(6 * dt, 0, 1));
      this.integrate(dt, platforms);
      return;
    }
    const C = this.cfg, b = this.behavior;
    const dx = player.x - this.x, dist = Math.abs(dx), away = (-Math.sign(dx)) || 1;

    if (this.state !== "windup") {
      // movement: Sentinel holds its ground; others kite to a preferred range
      if (b === "sentinel") {
        this.vx = lerp(this.vx, 0, clamp(8 * dt, 0, 1));
      } else {
        let move = 0;
        if (dist < C.tooClose) move = away;
        else if (dist > C.preferredDist * 1.3) move = -away;
        this.vx = lerp(this.vx, move * this.speed, clamp(6 * dt, 0, 1));
      }
      this.aimTimer -= dt;
      if (this.aimTimer <= 0) {
        this.state = "windup";
        const base = b === "sentinel" ? C.windup * 1.5 : (b === "marksman" ? CONFIG.chargedShot.windup : C.windup);
        this.windT = base * this.fireRateMult / this.auraHaste; this.windMax = this.windT;   // Herald hastens
      }
    } else {
      // aiming: Rifleman keeps strafing (so it leads you); others plant to fire
      if (b === "rifleman") this.vx = lerp(this.vx, away * this.speed * 0.5, clamp(5 * dt, 0, 1));
      else this.vx = lerp(this.vx, 0, clamp(12 * dt, 0, 1));
      this.windT -= dt;
      if (this.windT <= 0) {
        this._fire(player, projectiles, C);
        this.state = "kite";
        this.aimTimer = C.aimInterval * this.fireRateMult * (b === "sentinel" ? 1.15 : 1) / this.auraHaste;
      }
    }
    this.integrate(dt, platforms);
  }

  _fire(player, projectiles, C) {
    const b = this.behavior;
    const dmg = CONFIG.proj.dmg * this.auraDmg;   // War Priest empowers shots
    if (this.volley > 1) {                       // Volley affix: wide spread
      const base = Math.atan2(player.y - this.y, player.x - this.x);
      for (let i = 0; i < this.volley; i++) {
        const a = base + (i - (this.volley - 1) / 2) * 0.22;
        const p = new Projectile(this.x, this.y, Math.cos(a) * C.projSpeed, Math.sin(a) * C.projSpeed);
        p.dmg = dmg; p.tint = this.color; projectiles.push(p);
      }
      return;
    }
    if (b === "marksman") {                       // a long charge -> the fastest bolt in the game
      const CS = CONFIG.chargedShot;
      const dx = player.x - this.x, dy = player.y - this.y, m = len(dx, dy) || 1;
      const p = new Projectile(this.x, this.y, (dx / m) * CS.speed, (dy / m) * CS.speed);
      p.r = CS.r; p.dmg = CS.dmg * this.auraDmg; p.charged = true; p.tint = this.color;
      projectiles.push(p);
      return;
    }
    if (b === "warlock") {                        // slow shot that curves once toward you
      const X = CONFIG.exotic, dx = player.x - this.x, dy = player.y - this.y, m = len(dx, dy) || 1;
      const p = new Projectile(this.x, this.y, (dx / m) * X.warlockSpeed, (dy / m) * X.warlockSpeed);
      p.dmg = X.warlockDmg * this.auraDmg; p.curve = true; p.curveT = X.warlockCurveAt; p.r = 11; p.tint = this.color; p.kind = "orb";
      projectiles.push(p); return;
    }
    if (b === "chain") {                          // a shot that roots you in place on hit
      const X = CONFIG.exotic, dx = player.x - this.x, dy = player.y - this.y, m = len(dx, dy) || 1;
      const p = new Projectile(this.x, this.y, (dx / m) * X.chainSpeed, (dy / m) * X.chainSpeed);
      p.dmg = X.chainDmg * this.auraDmg; p.root = X.chainRoot; p.r = X.chainR; p.tint = this.color;
      projectiles.push(p); return;
    }
    if (b === "sentinel") { this.fireAt(player, projectiles, C.projSpeed * 1.15); return; }  // single precise shot
    // Rifleman leads your movement; default Ranged just double-taps where you are
    const lead = b === "rifleman" ? 0.2 : 0;
    const sp = C.projSpeed * (b === "rifleman" ? 1.1 : 1);
    for (let i = 0; i < 2; i++) {
      const tx = player.x + player.vx * lead, ty = player.y + player.vy * lead * 0.5;
      const dx = tx - this.x, dy = ty - this.y, m = len(dx, dy) || 1;
      const a = Math.atan2(dy, dx) + (i - 0.5) * (b === "rifleman" ? 0.0 : 0.07);
      const p = new Projectile(this.x, this.y, Math.cos(a) * sp, Math.sin(a) * sp);
      p.dmg = dmg; p.tint = this.color; projectiles.push(p);
    }
  }

  draw(ctx, player) {
    const r = this.hw + 2, b = this.behavior;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - r); ctx.lineTo(this.x + r, this.y);
    ctx.lineTo(this.x, this.y + r); ctx.lineTo(this.x - r, this.y);
    ctx.closePath();
    ctx.fillStyle = this.flash > 0 ? "#fff" : this.color;
    if (!(typeof GFX !== "undefined" && GFX.low)) { ctx.shadowColor = THEME.rim; ctx.shadowBlur = 6; } ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 2.5; ctx.stroke();

    // variant accents
    if (b === "sentinel") { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI * 2); ctx.fill(); }
    else if (b === "marksman") { ctx.fillStyle = THEME.ink; ctx.fillRect(this.x - 2, this.y - r - 4, 4, 6); }

    // aim telegraph during wind-up
    if (this.state === "windup" && player) {
      const k = 1 - clamp(this.windT / (this.windMax || this.cfg.windup), 0, 1);
      const dx = player.x - this.x, dy = player.y - this.y, m = len(dx, dy) || 1;
      const sentinel = b === "sentinel", marksman = b === "marksman";
      ctx.strokeStyle = THEME.ink; ctx.globalAlpha = sentinel ? 0.5 + 0.4 * k : 0.7;
      if (sentinel) ctx.setLineDash([]); else ctx.setLineDash([5, 6]);
      ctx.lineWidth = sentinel ? 1.2 : 1.5;
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + (dx / m) * 620, this.y + (dy / m) * 620); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      // a tracking dot at the player + a closing ring; marksman charges a growing orb
      if (sentinel) { ctx.fillStyle = CONFIG.colors.enemyShot; ctx.beginPath(); ctx.arc(player.x, player.y, 5, 0, Math.PI * 2); ctx.fill(); }
      if (marksman) {
        ctx.fillStyle = CONFIG.colors.enemyShot; ctx.globalAlpha = 0.4 + 0.5 * k;
        ctx.beginPath(); ctx.arc(this.x, this.y, 4 + k * (CONFIG.chargedShot.r - 2), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.lineWidth = 2; ctx.strokeStyle = THEME.ink;
        ctx.beginPath(); ctx.arc(this.x, this.y, 26 * (1 - k) + 6, 0, Math.PI * 2); ctx.stroke();
      }
    }
    this.drawHpBar(ctx);
  }
}

// ---- Aerial family: Flyer (angled swoop), Dive Bomber (telegraphed drop), Swooper (high dive) ----
class Flyer extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.flyer);
    this.color = CONFIG.colors.flyer;
    this.kind = "flyer";
    this.behavior = "swoop";
    this.state = "hover";
    this.aimTimer = this.cfg.swoopInterval * (0.5 + Math.random() * 0.6);
    this.swoopT = 0;
    this.warnT = 0;
    this.diveX = null;
  }

  update(dt, platforms, player) {
    this.tickTimers(dt);
    const C = this.cfg;
    if (this.behavior === "divebomb") this._divebomb(dt, player, C);
    else if (this.behavior === "highdive") this._highdive(dt, player, C);
    else this._swoop(dt, player, C);
    this.x = clamp(this.x, this.hw, CONFIG.view.w - this.hw);
    this.y = clamp(this.y, 40, CONFIG.world.groundY - this.hh);
    this.onGround = this.y >= CONFIG.world.groundY - this.hh - 1;
  }

  _swoop(dt, player, C) {
    if (this.state === "swoop") {
      this.swoopT -= dt; this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.swoopT <= 0) this.state = "recover";
    } else if (this.state === "recover") {
      // every dive ends by dropping to the ground for a brief, vulnerable stun
      this.vx = lerp(this.vx, 0, clamp(4 * dt, 0, 1));
      this.vy = lerp(this.vy, 560, clamp(5 * dt, 0, 1));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y >= CONFIG.world.groundY - this.hh - 2) {
        this.y = CONFIG.world.groundY - this.hh; this.stun = 0.7; this.state = "hover";
        this.aimTimer = C.swoopInterval; FX.burst(this.x, this.y + this.hh, 0, -1, 5, this.color);
      }
    } else {
      // hover to one side of the player so the dive comes in at an angle
      const tx = player.x + (this.x < player.x ? -130 : 130), ty = player.y - C.hoverY;
      const dx = tx - this.x, dy = ty - this.y, d = len(dx, dy) || 1;
      this.vx = lerp(this.vx, (dx / d) * this.speed, clamp(3 * dt, 0, 1));
      this.vy = lerp(this.vy, (dy / d) * this.speed, clamp(3 * dt, 0, 1));
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.aimTimer -= dt;
      if (this.aimTimer <= 0 && Math.abs(player.x - this.x) < 520) {
        this.state = "swoop"; this.swoopT = 0.45; this.aimTimer = C.swoopInterval;
        const m = len(player.x - this.x, player.y - this.y) || 1;
        this.vx = (player.x - this.x) / m * C.swoopSpeed;
        this.vy = (player.y - this.y) / m * C.swoopSpeed;
      }
    }
  }

  _divebomb(dt, player, C) {
    if (this.state === "warn") {
      this.diveX = this.diveX == null ? player.x : lerp(this.diveX, player.x, clamp(1.5 * dt, 0, 1));
      const ty = Math.max(120, player.y - 240);
      const dx = this.diveX - this.x, dy = ty - this.y, d = len(dx, dy) || 1;
      this.vx = lerp(this.vx, (dx / d) * this.speed * 1.2, clamp(4 * dt, 0, 1));
      this.vy = lerp(this.vy, (dy / d) * this.speed * 1.2, clamp(4 * dt, 0, 1));
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.warnT -= dt;
      if (this.warnT <= 0) { this.state = "dive"; this.vx = 0; this.vy = C.swoopSpeed * 1.55; }
    } else if (this.state === "dive") {
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y >= CONFIG.world.groundY - this.hh - 2) {
        this.y = CONFIG.world.groundY - this.hh; this.stun = 0.85; this.state = "hover";
        this.aimTimer = C.swoopInterval * 1.2; this.diveX = null;
        FX.ring(this.x, this.y + this.hh, 13, CONFIG.colors.slam); FX.burst(this.x, this.y + this.hh, 0, -1, 7, this.color);
      }
    } else {
      const tx = player.x, ty = player.y - C.hoverY - 40;
      const dx = tx - this.x, dy = ty - this.y, d = len(dx, dy) || 1;
      this.vx = lerp(this.vx, (dx / d) * this.speed, clamp(3 * dt, 0, 1));
      this.vy = lerp(this.vy, (dy / d) * this.speed, clamp(3 * dt, 0, 1));
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.aimTimer -= dt;
      if (this.aimTimer <= 0) { this.state = "warn"; this.warnT = 1.1; this.diveX = player.x; }
    }
  }

  _highdive(dt, player, C) {
    if (this.state === "dive") {
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y >= CONFIG.world.groundY - this.hh - 2 || this.x <= this.hw + 1 || this.x >= CONFIG.view.w - this.hw - 1) {
        this.state = "climb"; this.aimTimer = C.swoopInterval;
      }
    } else if (this.state === "climb") {
      this.vy = lerp(this.vy, -this.speed * 2.4, clamp(4 * dt, 0, 1));
      this.vx = lerp(this.vx, (player.x > this.x ? 1 : -1) * this.speed, clamp(2 * dt, 0, 1));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y <= 70) this.state = "hover";
    } else {
      this.y = lerp(this.y, 78, clamp(2 * dt, 0, 1));
      this.vx = lerp(this.vx, (player.x - this.x) * 0.6, clamp(2 * dt, 0, 1));
      this.x += this.vx * dt;
      this.aimTimer -= dt;
      if (this.aimTimer <= 0 && Math.abs(player.x - this.x) < 720) {
        this.state = "dive";
        const m = len(player.x - this.x, player.y - this.y) || 1;
        this.vx = (player.x - this.x) / m * C.swoopSpeed * 1.6;
        this.vy = (player.y - this.y) / m * C.swoopSpeed * 1.6;
      }
    }
  }

  draw(ctx) {
    // Dive Bomber's ground warning marker
    if (this.behavior === "divebomb" && this.state === "warn" && this.diveX != null) {
      const gy = CONFIG.world.groundY, k = 1 - clamp(this.warnT / 1.1, 0, 1);
      ctx.strokeStyle = CONFIG.colors.slam; ctx.globalAlpha = 0.35 + 0.5 * k; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.diveX, gy - 4, 34 - 22 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.diveX, this.y + this.hh); ctx.setLineDash([4, 8]); ctx.lineTo(this.diveX, gy - 4); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    const dir = Math.sign(this.vx) || 1, r = this.hw + 3;
    ctx.fillStyle = this.flash > 0 ? "#fff" : (this.stun > 0 ? "#c4a8e0" : this.color);
    ctx.beginPath();
    ctx.moveTo(this.x + dir * r, this.y);
    ctx.lineTo(this.x - dir * r, this.y - this.hh);
    ctx.lineTo(this.x - dir * r * 0.4, this.y);
    ctx.lineTo(this.x - dir * r, this.y + this.hh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 2; ctx.stroke();
    // variant accent: a downward fang on divers
    if (this.behavior !== "swoop") {
      ctx.fillStyle = THEME.ink;
      ctx.beginPath(); ctx.moveTo(this.x - 4, this.y + this.hh - 2); ctx.lineTo(this.x + 4, this.y + this.hh - 2); ctx.lineTo(this.x, this.y + this.hh + 6); ctx.fill();
    }
    this.drawHpBar(ctx);
  }
}

// ---- Hazard family: Bomber (arcing deflectable bombs), Juggler (3-bomb burst), Trapper (mines) ----
class Bomber extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.bomber);
    this.color = CONFIG.colors.bomber;
    this.kind = "bomber";
    this.behavior = "lob";
    this.lobTimer = CONFIG.bomber.lobInterval * (0.5 + Math.random() * 0.7);
    this.mineTimer = CONFIG.bomber.mineInterval * (0.6 + Math.random() * 0.6);
    this.bombsLeft = 0;
    this.burstT = 0;
  }

  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    const C = this.cfg;
    if (this.canClimb && this.atk !== "channel" && this.climbNav(player, platforms, dt)) {   // reposition up to a perched player — but never abandon a Geomancer wall-channel mid-cast (its timer would pause and the half-wall linger, then teleport-resume); matches Charger/Ranged holding position during a committed attack
      if (this.onGround) this.vx = lerp(this.vx, this.navDir * this.speed, clamp(7 * dt, 0, 1));
      this.integrate(dt, platforms);
      return;
    }
    if (this.behavior === "trap") this._trap(dt, player, projectiles, C);
    else if (this.behavior === "sludge") this._sludge(dt, player, projectiles, C);
    else if (this.behavior === "geo") this._geo(dt, player, projectiles, C);
    else this._lob(dt, player, projectiles, C);
    this.integrate(dt, platforms);
  }

  // Sludge: lobs a glob of mud that lands and leaves a slowing puddle
  _sludge(dt, player, projectiles, C) {
    this._kite(dt, player, C.standoff);
    this.lobTimer -= dt;
    if (this.lobTimer <= 0 && Math.abs(player.x - this.x) < 780) {
      const X = CONFIG.exotic, vx = clamp(player.x - this.x, -X.sludgeSpeed, X.sludgeSpeed);
      const p = new Projectile(this.x, this.y - this.hh, vx, -X.sludgeArc);
      p.gravity = X.sludgeGravity; p.mud = true; p.r = X.sludgeR;
      projectiles.push(p);
      this.lobTimer = X.sludgeInterval / this.auraHaste;
    }
  }

  // Geomancer: channels, then raises a temporary wall that sections off the arena
  // (killing it during the channel stops the wall). The game spawns the wall from wallRequest.
  _geo(dt, player, projectiles, C) {
    const X = CONFIG.exotic;
    if (this.atk === "channel") {
      this.vx = lerp(this.vx, 0, clamp(9 * dt, 0, 1)); this.atkT -= dt;
      if (this.atkT <= 0) { this.wallRequest = { x: this.geoX }; this.atk = "idle"; this.lobTimer = X.geoInterval; }
    } else {
      this._kite(dt, player, C.standoff);
      this.lobTimer -= dt;
      if (this.lobTimer <= 0 && Math.abs(player.x - this.x) < X.geoRange && this.onGround) {
        const dir = Math.sign(player.x - this.x) || 1;
        this.geoX = clamp(this.x + dir * 160, 60, CONFIG.view.w - 60);
        this.atk = "channel"; this.atkT = X.geoChannel; this.atkMax = X.geoChannel;
      }
    }
  }

  // hold a throwing distance from the player
  _kite(dt, player, standoff) {
    const dx = player.x - this.x, dist = Math.abs(dx), away = (-Math.sign(dx)) || 1;
    let move = 0;
    if (dist < standoff * 0.7) move = away;
    else if (dist > standoff * 1.25) move = -away;
    this.vx = lerp(this.vx, move * this.speed, clamp(6 * dt, 0, 1));
  }

  _lobBomb(player, projectiles, spread) {
    const C = this.cfg;
    const dx = player.x - this.x;
    const vx = clamp(dx * 1.05, -C.bombSpeed, C.bombSpeed) + (spread || 0);
    const p = new Projectile(this.x, this.y - this.hh, vx, -C.bombArc);
    p.gravity = C.bombGravity; p.bomb = true; p.r = 12; p.dmg = C.blastDmg;
    projectiles.push(p);
  }

  _lob(dt, player, projectiles, C) {
    this._kite(dt, player, C.standoff);
    if (this.bombsLeft > 0) {                       // Juggler: rapid 3-bomb burst
      this.burstT -= dt;
      if (this.burstT <= 0) { this._lobBomb(player, projectiles, (this.bombsLeft - 2) * 60); this.bombsLeft--; this.burstT = 0.18; }
      if (this.bombsLeft === 0) this.lobTimer = C.lobInterval / this.auraHaste;
      return;
    }
    this.lobTimer -= dt;
    if (this.lobTimer <= 0 && Math.abs(player.x - this.x) < 760) {
      if (this.behavior === "juggle") { this.bombsLeft = 3; this.burstT = 0; }
      else { this._lobBomb(player, projectiles, 0); this.lobTimer = C.lobInterval / this.auraHaste; }
    }
  }

  _trap(dt, player, projectiles, C) {
    this._kite(dt, player, C.standoff * 0.65);
    this.mineTimer -= dt;
    if (this.mineTimer <= 0 && this.onGround) {
      const m = new Projectile(this.x, this.y, 0, 0);
      m.mine = true; m.gravity = C.bombGravity; m.r = 11; m.armT = C.mineArm;
      projectiles.push(m);
      this.mineTimer = C.mineInterval / this.auraHaste;
    }
  }

  draw(ctx) {
    // Geomancer channel telegraph: a wall rising from the floor at the target spot
    if (this.behavior === "geo" && this.atk === "channel" && this.geoX != null) {
      const k = 1 - clamp(this.atkT / (this.atkMax || 1), 0, 1), X = CONFIG.exotic, gy = CONFIG.world.groundY;
      ctx.fillStyle = CONFIG.colors.sludge; ctx.globalAlpha = 0.3 + 0.4 * k;
      ctx.fillRect(this.geoX - X.geoWallW / 2, gy - X.geoWallH * k, X.geoWallW, X.geoWallH * k);
      ctx.globalAlpha = 1;
      // channel link
      ctx.strokeStyle = CONFIG.colors.sludge; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.geoX, gy - X.geoWallH * k * 0.5); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = this.flash > 0 ? "#fff" : this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.hw, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = THEME.ink; ctx.fillRect(this.x - 2, this.y - this.hh - 8, 4, 8);   // launcher spout
    // variant accent
    if (this.behavior === "trap") { ctx.fillStyle = "#fff"; ctx.fillRect(this.x - 6, this.y - 1, 12, 3); }
    else if (this.behavior === "juggle") { ctx.fillStyle = "#fff"; for (let i = 0; i < 3; i++) ctx.fillRect(this.x - 6 + i * 5, this.y - 3, 3, 3); }
    else if (this.behavior === "sludge") { ctx.fillStyle = CONFIG.colors.sludge; ctx.beginPath(); ctx.arc(this.x, this.y, this.hw * 0.5, 0, Math.PI * 2); ctx.fill(); }
    else if (this.behavior === "geo") { ctx.fillStyle = "#fff"; ctx.fillRect(this.x - 5, this.y - 4, 10, 8); }
    this.drawHpBar(ctx);
  }
}

// ---- Armored: shielded on the side it faces; needs a fast hit or a flank ----
class Armored extends Enemy {
  constructor(x, y) { super(x, y, CONFIG.armored); this.guardSide = 1; this.color = CONFIG.colors.armored; this.kind = "armored"; this.stompCd = CONFIG.armored.stompCd * 0.6; }
  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    this.guardSide = Math.sign(player.x - this.x) || 1;
    if (this.stompCd > 0) this.stompCd -= dt;
    const C = this.cfg;
    // enraged: chase onto platforms after a perched player
    if (this.enraged && this.canClimb && this.stun <= 0 && this.climbNav(player, platforms, dt)) {
      if (this.onGround) this.vx = lerp(this.vx, this.navDir * this.speed * 1.8, clamp(8 * dt, 0, 1));
      this.integrate(dt, platforms);
      return;
    }
    // shielded STOMP: a telegraphed ground pound sends shockwaves you must jump over
    if (!this.enraged && this.stun <= 0) {
      if (this.atk === "stompwind") {
        this.vx = lerp(this.vx, 0, clamp(10 * dt, 0, 1)); this.atkT -= dt;
        if (this.atkT <= 0) { this._stomp(projectiles, C); this.atk = "idle"; this.stompCd = C.stompCd; }
        this.integrate(dt, platforms); return;
      }
      if (this.onGround && this.stompCd <= 0 && Math.abs(player.x - this.x) < C.stompRange && Math.abs(player.y - this.y) < 130) {
        this.atk = "stompwind"; this.atkT = C.stompWindup; this.atkMax = C.stompWindup;
        this.integrate(dt, platforms); return;
      }
    }
    const sp = this.stun > 0 ? 0 : (this.enraged ? this.speed * 1.8 : this.speed);
    this.vx = lerp(this.vx, this.guardSide * sp, clamp((this.enraged ? 8 : 5) * dt, 0, 1));
    this.integrate(dt, platforms);
  }
  _stomp(projectiles, C) {
    const footY = this.y + this.hh;   // shock travels along whatever surface it's standing on
    for (const d of [-1, 1]) {
      const p = new Projectile(this.x + d * this.hw, footY - C.shockR, d * C.shockSpeed, 0);
      p.shock = true; p.r = C.shockR; p.dmg = C.shockDmg; p.life = 1.6;
      projectiles.push(p);
    }
    FX.ring(this.x, footY, 14, CONFIG.colors.slam);
    FX.burst(this.x, footY, 0, -1, 9, CONFIG.colors.armored);
    if (typeof SFX !== "undefined" && SFX.ctx && SFX.slam) SFX.slam();
  }
  // blocked if the hit lands on the guarded (player-facing) side below break speed.
  // Once enraged (shield broken) it no longer blocks anything.
  blocks(hitFromX, tipSpeed) {
    if (this.stun > 0 || this.enraged) return false;
    const side = Math.sign(hitFromX - this.x) || 1;
    return side === this.guardSide && tipSpeed < this.cfg.breakSpeed;
  }
  damageTakenMult() { return this.enraged ? 1.15 : (this.onGround ? CONFIG.armored.groundDR : CONFIG.armored.airDR); }
  draw(ctx) {
    const x = this.x - this.hw, y = this.y - this.hh, w = this.hw * 2, h = this.hh * 2;
    const vulnerable = !this.onGround;   // launched -> takes full/extra damage
    // stomp wind-up telegraph: a building warning along the floor on both sides
    if (this.atk === "stompwind") {
      const k = 1 - clamp(this.atkT / (this.atkMax || 0.55), 0, 1);
      const gy = this.y + this.hh;   // telegraph along its current surface (platform or floor)
      ctx.strokeStyle = CONFIG.colors.slam; ctx.globalAlpha = 0.35 + 0.5 * k; ctx.lineWidth = 3 + k * 3;
      ctx.beginPath(); ctx.moveTo(this.x - (40 + 160 * k), gy - 2); ctx.lineTo(this.x + (40 + 160 * k), gy - 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const body = this.enraged ? CONFIG.colors.charger : this.color;   // enraged runs hot
    ctx.fillStyle = this.flash > 0 ? "#fff" : (this.stun > 0 ? "#9aa6b2" : body);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    // vulnerable (airborne) -> dashed double outline so it reads as "hit me now"
    if (vulnerable && this.stun <= 0) {
      ctx.strokeStyle = CONFIG.colors.slam;
      ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeRect(x - 4, y - 4, w + 8, h + 8); ctx.setLineDash([]);
    }
    if (this.enraged) {
      // shield is gone — show angry spikes instead
      ctx.fillStyle = THEME.ink;
      for (let i = 0; i < 3; i++) { const sx = x + 6 + i * (w - 12) / 2; ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 5, y - 8); ctx.lineTo(sx + 10, y); ctx.fill(); }
    } else if (this.stun <= 0) {
      // bold cyan shield: a thick offset bar with prongs on the guarded side
      const gx = this.x + this.guardSide * (this.hw + 9);
      ctx.fillStyle = CONFIG.colors.armoredShield;
      ctx.fillRect(gx - 4, y - 6, 8, h + 12);
      ctx.fillRect(gx - this.guardSide * 6 - 1, y - 6, this.guardSide * 7, 5);
      ctx.fillRect(gx - this.guardSide * 6 - 1, y + h + 1, this.guardSide * 7, 5);
    }
    this.drawHpBar(ctx);
  }
}

// ---- Boss: large, multi-phase ----
class Boss extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.boss);
    this.color = CONFIG.colors.boss;
    this.kind = "boss";
    this.isBoss = true;
    this.fireTimer = 2;
  }
  get phase() { const f = this.hp / this.maxHp; return f > 0.66 ? 1 : (f > 0.33 ? 2 : 3); }
  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    const C = this.cfg, ph = this.phase;
    const dir = Math.sign(player.x - this.x) || 1;
    this.vx = lerp(this.vx, dir * C.speed * (1 + (ph - 1) * 0.4), clamp(4 * dt, 0, 1));
    this.integrate(dt, platforms);
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = C.fireBase / ph;
      const shots = ph === 1 ? 1 : (ph === 2 ? 3 : 5);
      const base = Math.atan2(player.y - this.y, player.x - this.x);
      for (let i = 0; i < shots; i++) {
        const a = base + (i - (shots - 1) / 2) * 0.24;
        projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * CONFIG.proj.speed, Math.sin(a) * CONFIG.proj.speed));
      }
    }
  }
  draw(ctx) {
    const x = this.x - this.hw, y = this.y - this.hh, w = this.hw * 2, h = this.hh * 2;
    ctx.fillStyle = this.flash > 0 ? "#fff" : this.color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
    // eye + phase pips
    ctx.fillStyle = "#fff";
    const dir = Math.sign(this.vx) || 1;
    ctx.fillRect(this.x + dir * 18 - 9, this.y - 18, 18, 14);
    for (let i = 0; i < this.phase; i++) ctx.fillRect(x + 12 + i * 16, y + h - 18, 10, 8);
    // local hp bar hidden (a big one is drawn in the HUD)
  }
}

// ---- Support family: no real attack, they make every OTHER enemy worse (priority kills) ----
// War Priest (damage-reduction aura), Herald (speed buff), Mender (heals allies), Anchor
// (shields a tethered ally). The actual buff/heal/tether is applied by updateSupports() in
// game.js (it has the enemy list); these classes handle movement + drawing the effect.
class Support extends Enemy {
  constructor(x, y, type) {
    super(x, y, CONFIG.support);
    this.kind = "support";
    this.supportType = type;
    this.range = CONFIG.support.range;
    this.color = CONFIG.colors[type] || CONFIG.colors.priest;
    if (type === "anchor") { this.hp *= 0.55; this.maxHp *= 0.55; this.hpDisplay = this.hp; }  // fragile
    this.links = [];          // allies this support is currently affecting (set by updateSupports)
    this.auraPulse = Math.random() * 6;
  }
  update(dt, platforms, player) {
    this.tickTimers(dt);
    this.auraPulse += dt;
    // hang back from the player at a protected distance
    const dx = player.x - this.x, dist = Math.abs(dx), away = (-Math.sign(dx)) || 1;
    const KEEP = CONFIG.support.keepAway;
    let move = 0;
    if (dist < KEEP) move = away;
    else if (dist > KEEP * 1.7) move = -away;
    this.vx = lerp(this.vx, move * this.speed, clamp(5 * dt, 0, 1));
    this.integrate(dt, platforms);
  }
  draw(ctx) {
    const t = this.supportType, x = this.x, y = this.y, hw = this.hw, hh = this.hh;
    // clear connection lines to EVERY ally this support is affecting (so you can see who to break)
    if (this.links && this.links.length) {
      const beam = t === "mender" || t === "anchor";
      ctx.strokeStyle = this.color; ctx.lineWidth = beam ? 3 : 2;
      for (const a of this.links) {
        if (a.dead) continue;
        ctx.globalAlpha = 0.4 + 0.18 * Math.sin(this.auraPulse * 6);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(a.x, a.y); ctx.stroke();
        ctx.globalAlpha = 0.8; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(a.x, a.y - a.hh - 7, 3, 0, Math.PI * 2); ctx.fill();   // marker over the buffed ally
      }
      ctx.globalAlpha = 1;
    }
    // aura ring for the field supports
    if (t === "priest" || t === "herald") {
      ctx.strokeStyle = this.color; ctx.globalAlpha = 0.22 + 0.12 * Math.sin(this.auraPulse * 3.5);
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, this.range, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Anchor: a shield bubble around the bonded ally
    if (t === "anchor" && this.links && this.links[0] && !this.links[0].dead) {
      const a = this.links[0], r = a.radius + 12;
      ctx.strokeStyle = this.color; ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.auraPulse * 4);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.1; ctx.fillStyle = this.color; ctx.fill();
      ctx.globalAlpha = 1;
    }

    // distinct silhouette per support type so they read apart at a glance
    const body = this.flash > 0 ? "#fff" : this.color;
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 2.5;
    if (t === "priest") {
      // tall robe + a halo ring (authority)
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x + hw, y); ctx.lineTo(x + hw * 0.7, y + hh);
      ctx.lineTo(x - hw * 0.7, y + hh); ctx.lineTo(x - hw, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y - hh - 4, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillRect(x - 2, y - 7, 4, 14); ctx.fillRect(x - 6, y - 3, 12, 4);   // cross
    } else if (t === "herald") {
      // slim body holding a banner on a tall pole
      ctx.fillStyle = body; ctx.fillRect(x - hw * 0.55, y - hh * 0.6, hw * 1.1, hh * 1.6); ctx.strokeRect(x - hw * 0.55, y - hh * 0.6, hw * 1.1, hh * 1.6);
      ctx.fillStyle = THEME.ink; ctx.fillRect(x + hw * 0.55, y - hh, 3, hh * 2);                 // pole
      ctx.fillStyle = body; ctx.fillRect(x + hw * 0.55 + 3, y - hh, 16, 12); ctx.strokeRect(x + hw * 0.55 + 3, y - hh, 16, 12);   // flag
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(x + hw * 0.55 + 6, y - hh + 3); ctx.lineTo(x + hw * 0.55 + 12, y - hh + 6); ctx.lineTo(x + hw * 0.55 + 6, y - hh + 9); ctx.fill();
    } else if (t === "mender") {
      // round, hunched body + a big cross
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x, y, hw * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillRect(x - 2.5, y - 10, 5, 20); ctx.fillRect(x - 9, y - 2.5, 18, 5);
    } else {
      // anchor: a heavy, blocky body + an anchor emblem (chains)
      ctx.fillStyle = body; ctx.fillRect(x - hw, y - hh * 0.7, hw * 2, hh * 1.7); ctx.strokeRect(x - hw, y - hh * 0.7, hw * 2, hh * 1.7);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - 6, 3, 0, Math.PI * 2); ctx.stroke();                    // ring
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 8); ctx.stroke();               // shaft
      ctx.beginPath(); ctx.moveTo(x - 7, y + 4); ctx.quadraticCurveTo(x, y + 12, x + 7, y + 4); ctx.stroke();   // flukes
    }
    this.drawHpBar(ctx);
  }
}

// ---- Wraith (special): immune to direct blade hits; only a thrown blade or a deflected
//      shot kills it. Forces you to orchestrate the arena instead of just swinging. ----
class Wraith extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.wraith);
    this.kind = "wraith";
    this.color = CONFIG.colors.wraith;
    this.immuneToBlade = true;
    this.phase = Math.random() * 6;
  }
  update(dt, platforms, player) {
    this.tickTimers(dt);
    this.phase += dt;
    const tx = player.x, ty = player.y - CONFIG.wraith.hoverY;
    const dx = tx - this.x, dy = ty - this.y, d = len(dx, dy) || 1;
    this.vx = lerp(this.vx, (dx / d) * this.speed, clamp(2.4 * dt, 0, 1));
    this.vy = lerp(this.vy, (dy / d) * this.speed, clamp(2.4 * dt, 0, 1));
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.x = clamp(this.x, this.hw, CONFIG.view.w - this.hw);
    this.y = clamp(this.y, 50, CONFIG.world.groundY - this.hh);
    this.onGround = false;
  }
  draw(ctx) {
    const x = this.x, y = this.y, hw = this.hw, hh = this.hh;
    ctx.globalAlpha = 0.5 + 0.22 * Math.sin(this.phase * 3);
    ctx.fillStyle = this.flash > 0 ? "#fff" : this.color;
    ctx.beginPath();
    ctx.moveTo(x, y - hh); ctx.lineTo(x + hw, y); ctx.lineTo(x + hw * 0.5, y + hh);
    ctx.lineTo(x, y + hh * 0.55); ctx.lineTo(x - hw * 0.5, y + hh); ctx.lineTo(x - hw, y);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = THEME.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = CONFIG.colors.eye; ctx.fillRect(x - 7, y - 4, 4, 6); ctx.fillRect(x + 3, y - 4, 4, 6);
    this.drawHpBar(ctx);
  }
}

// ---- Chimera (special): adopts the attacks of the enemy types in its wave (often several)
//      and cycles through them. The wind-up colors it to the move that's coming. ----
const CHIMERA_MOVE_COLOR = {
  charger: "charger", brawler: "charger", stalker: "charger",
  ranged: "ranged", flyer: "flyer", bomber: "bomber", armored: "armored",
};
class Chimera extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.chimera);
    this.kind = "chimera";
    this.color = CONFIG.colors.chimera;
    this.atk = "idle"; this.atkT = 0;
    this.copyT = 1.4 + Math.random();
    this.moves = ["charger"];   // overwritten at spawn from the wave roster
    this.curMove = "charger";
  }
  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    const C = this.cfg, dir = Math.sign(player.x - this.x) || 1, dist = Math.abs(player.x - this.x), away = -dir;
    if (this.atk === "windup") {
      this.vx = lerp(this.vx, 0, clamp(10 * dt, 0, 1)); this.atkT -= dt;
      if (this.atkT <= 0) this._exec(player, projectiles, dir);
    } else if (this.atk === "strike") {
      this.atkT -= dt; if (this.atkT <= 0) { this.atk = "recover"; this.copyT = 1.3; }
    } else if (this.atk === "recover") {
      // recover drains copyT to ~0; RESET it on the handoff to idle, or the idle block below
      // sees copyT<=0 on the very next frame and re-attacks instantly — skipping the intended
      // wander/reposition beat (without this the Chimera just plants and attacks ~every 1.85s).
      this.vx = lerp(this.vx, 0, clamp(7 * dt, 0, 1)); this.copyT -= dt; if (this.copyT <= 0) { this.atk = "idle"; this.copyT = 0.9 + Math.random() * 0.6; }   // idle reposition window (tunable)
    } else {
      let move = 0;
      if (dist > 380) move = dir; else if (dist < 210) move = away;
      this.vx = lerp(this.vx, move * this.speed, clamp(6 * dt, 0, 1));
      this.copyT -= dt;
      if (this.copyT <= 0 && dist < 660) {
        this.atk = "windup"; this.atkT = C.copyDelay;
        this.curMove = this.moves[Math.floor(Math.random() * this.moves.length)] || "charger";
      }
    }
    this.integrate(dt, platforms);
  }
  _exec(player, projectiles, dir) {
    const k = this.curMove;
    if (k === "ranged") {
      const dx = player.x - this.x, dy = player.y - this.y, m = len(dx, dy) || 1, sp = CONFIG.ranged.projSpeed;
      const p = new Projectile(this.x, this.y, (dx / m) * sp, (dy / m) * sp); p.dmg = CONFIG.proj.dmg * this.auraDmg;
      projectiles.push(p); this.atk = "recover"; this.copyT = 1.3;
    } else if (k === "bomber") {
      const B = CONFIG.bomber, vx = clamp((player.x - this.x) * 1.05, -B.bombSpeed, B.bombSpeed);
      const p = new Projectile(this.x, this.y - this.hh, vx, -B.bombArc);
      p.gravity = B.bombGravity; p.bomb = true; p.r = 12; p.dmg = B.blastDmg;
      projectiles.push(p); this.atk = "recover"; this.copyT = 1.3;
    } else if (k === "armored") {
      const A = CONFIG.armored, footY = this.y + this.hh;
      for (const d of [-1, 1]) { const p = new Projectile(this.x + d * this.hw, footY - A.shockR, d * A.shockSpeed, 0); p.shock = true; p.r = A.shockR; p.dmg = A.shockDmg; p.life = 1.5; projectiles.push(p); }
      FX.ring(this.x, footY, 12, CONFIG.colors.slam); this.atk = "recover"; this.copyT = 1.4;
    } else if (k === "flyer") {
      this.atk = "strike"; this.atkT = 0.4; this.vx = dir * 600; this.vy = -540;   // leap-dive
    } else {  // charger / brawler / stalker -> a committed lunge
      this.atk = "strike"; this.atkT = 0.32; this.vx = dir * 740;
    }
  }
  draw(ctx) {
    const x = this.x, y = this.y, hw = this.hw, hh = this.hh;
    const cueCol = CONFIG.colors[CHIMERA_MOVE_COLOR[this.curMove] || "chimera"];
    const active = this.atk === "windup" || this.atk === "strike";
    // a hunched, asymmetric patchwork beast (clearly NOT the old box) — jagged crest of
    // mismatched spikes, two mismatched halves, a cluster of eyes. The "many faces."
    if (this.atk === "windup") {   // telegraph in the color of the move it's about to use
      ctx.strokeStyle = cueCol; ctx.globalAlpha = 0.6; ctx.setLineDash([5, 4]); ctx.lineWidth = 2.5;
      ctx.strokeRect(x - hw - 4, y - hh - 4, hw * 2 + 8, hh * 2 + 8); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // body: an irregular hexagon
    ctx.beginPath();
    ctx.moveTo(x - hw, y - hh * 0.2);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.7, y - hh * 0.8);
    ctx.lineTo(x + hw, y + hh * 0.1);
    ctx.lineTo(x + hw * 0.5, y + hh);
    ctx.lineTo(x - hw * 0.7, y + hh);
    ctx.closePath();
    ctx.fillStyle = this.flash > 0 ? "#fff" : (active ? cueCol : this.color);
    ctx.fill();
    // mismatched left half tint (patchwork)
    ctx.save(); ctx.clip();
    ctx.globalAlpha = 0.35; ctx.fillStyle = THEME.ink;
    ctx.fillRect(x - hw, y - hh, hw, hh * 2);
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 3; ctx.stroke();
    // jagged crest of mismatched spikes
    ctx.fillStyle = THEME.ink;
    for (let i = -1; i <= 2; i++) {
      const sx = x + i * (hw * 0.5) - 3, sh = 6 + ((i + 1) % 3) * 4;
      ctx.beginPath(); ctx.moveTo(sx, y - hh * 0.7); ctx.lineTo(sx + 4, y - hh * 0.7 - sh); ctx.lineTo(sx + 8, y - hh * 0.7); ctx.fill();
    }
    // a cluster of three eyes (the "many faces")
    ctx.fillStyle = CONFIG.colors.eye;
    ctx.fillRect(x - 8, y - 2, 4, 5); ctx.fillRect(x - 1, y - 5, 4, 5); ctx.fillRect(x + 5, y - 1, 4, 5);
    this.drawHpBar(ctx);
  }
}

// Shared charge telegraph: paints the lane a boss is about to charge down so the player
// can read it and prepare. `k` (0..1) is wind-up progress — the lane fills + the arrows
// march faster as the charge commits. Drawn at the boss's ACTUAL charge height (no more
// last-instant teleport to the player's level).
function chargeTelegraph(ctx, x, cy, hh, dir, k, color) {
  const W = CONFIG.view.w;
  const x0 = dir > 0 ? x : 0, x1 = dir > 0 ? W : x, ww = x1 - x0;
  ctx.save();
  // lane fill
  ctx.fillStyle = color; ctx.globalAlpha = 0.10 + 0.18 * k;
  ctx.fillRect(x0, cy - hh, ww, hh * 2);
  // bright pulsing rails top + bottom
  ctx.globalAlpha = 0.45 + 0.45 * k;
  ctx.fillRect(x0, cy - hh - 1, ww, 3); ctx.fillRect(x0, cy + hh - 2, ww, 3);
  // chevrons marching the way it'll go
  ctx.globalAlpha = 0.5 + 0.4 * k;
  const march = (performance.now() / 90 * dir) % 46;
  for (let ax = x0 - 46 + march; ax < x1; ax += 46) {
    const px = dir > 0 ? ax : ax;
    ctx.beginPath(); ctx.moveTo(px, cy - 9); ctx.lineTo(px + dir * 13, cy); ctx.lineTo(px, cy + 9); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ====================================================================================
//  BOSS FRAMEWORK — The Warden (Stage 1). HP-gated phases, an attack scheduler, and
//  arena-effect hooks (floor shockwaves, mortar fire, prohibited zones, platform vaulting,
//  a fake-death beat, and a ceiling-cling finale). Later bosses follow the same shape.
// ====================================================================================
class Warden extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.boss);
    this.color = CONFIG.colors.boss;
    this.kind = "boss"; this.isBoss = true; this.bossName = "THE WARDEN";
    this.state = "idle"; this.stateT = 0;
    this.atkT = 1.8; this.pendingAtk = "baton";
    this.facing = 1;
    this.zones = [];              // phase-2 prohibited zones [{x}]
    this.zoneShiftT = 0;
    this.phaseMarker = 1;
    this.onCeiling = false;
    this.ceilDropT = 0;
    this.lungeT = CONFIG.warden.lungeCd;
    this.batonA = -0.6; this.batonPrevA = -0.6; this.batonStrike = 0;
  }
  get phase() { const f = this.hp / this.maxHp; return f > 0.65 ? 1 : (f > 0.30 ? 2 : 3); }

  // animate the baton: raised on a wind-up, slammed through on the strike
  _animBaton(dt) {
    let wt = -0.45, k = 9;
    if (this.batonStrike > 0) { this.batonStrike -= dt; wt = 0.85; k = 30; }
    else if (this.state === "windup") { wt = this.pendingAtk === "mortar" ? -1.7 : -1.45; k = 8; }
    else if (this.state === "lunge") { wt = 0.2; k = 14; }
    this.batonPrevA = this.batonA;
    this.batonA = lerp(this.batonA, wt, clamp(k * dt, 0, 1));
  }

  _shock(projectiles, dir, footY) {
    const Wc = CONFIG.warden;
    const p = new Projectile(this.x + dir * this.hw, footY - Wc.shockR, dir * Wc.shockSpeed, 0);
    p.shock = true; p.r = Wc.shockR; p.dmg = Wc.shockDmg; p.life = 2.0;
    projectiles.push(p);
  }
  _mortar(player, projectiles) {
    const Wc = CONFIG.warden, v = Wc.mortarSpeed, g = Wc.mortarGravity;
    const t = (2 * v) / g, baseVx = (player.x - this.x) / t;   // ballistic so the middle shot lands on you
    for (let i = -1; i <= 1; i++) {
      const p = new Projectile(this.x, this.y - this.hh, baseVx + i * 130, -v);
      p.gravity = g; p.dmg = Wc.mortarDmg; p.r = 11;
      projectiles.push(p);
    }
  }

  _enterPhase(ph, platforms) {
    const Wc = CONFIG.warden;
    if (ph === 2) {
      this.zones = [];
      for (let i = 0; i < Wc.zoneCount; i++) this.zones.push({ x: 240 + Math.random() * (CONFIG.view.w - 480) });
      this.zoneShiftT = Wc.zoneShift;
    } else if (ph === 3) {
      this.zones = [];
      this.state = "fakedeath"; this.stateT = 2.2;   // The Fake: slump, then rise
      const ow = platforms.filter((p) => p.oneway);   // rip a platform out of the arena
      if (ow.length) { const idx = platforms.indexOf(ow[Math.floor(Math.random() * ow.length)]); if (idx >= 0) platforms.splice(idx, 1); }
    }
  }

  _deathLocked() { return this.state === "fakedeath"; }   // P3 fake-death: don't let a hit/DoT skip the ceiling phase
  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    this._animBaton(dt);
    const Wc = CONFIG.warden, ph = this.phase;
    this.facing = Math.sign(player.x - this.x) || this.facing;
    if (ph !== this.phaseMarker) { this._enterPhase(ph, platforms); this.phaseMarker = ph; }

    if (this.zones.length) {   // prohibited zones drift to new spots
      this.zoneShiftT -= dt;
      if (this.zoneShiftT <= 0) { for (const z of this.zones) z.x = 240 + Math.random() * (CONFIG.view.w - 480); this.zoneShiftT = Wc.zoneShift; }
    }

    if (this.state === "fakedeath") {
      this.vx = lerp(this.vx, 0, clamp(4 * dt, 0, 1)); this.integrate(dt, platforms);
      this.stateT -= dt;
      if (this.stateT <= 0) { this.onCeiling = true; this.state = "idle"; this.ceilDropT = Wc.ceilDropCd; this.lungeT = Wc.lungeCd; }
      return;
    }
    if (this.onCeiling) { this._ceiling(dt, player, projectiles, Wc); return; }

    // ---- grounded phases (1 & 2) ----
    const footY = this.y + this.hh, dist = Math.abs(player.x - this.x);
    const sp = CONFIG.boss.speed * (1 + (ph - 1) * 0.35);
    if (this.state === "windup") {
      this.vx = lerp(this.vx, 0, clamp(8 * dt, 0, 1)); this.stateT -= dt;
      if (this.stateT <= 0) { this._fire(player, projectiles, footY, Wc); this.state = "idle"; this.atkT = Wc.batonCd / (1 + (ph - 1) * 0.3); }
    } else {
      this.vx = lerp(this.vx, this.facing * sp, clamp(3 * dt, 0, 1));
      this.atkT -= dt;
      if (this.atkT <= 0) {
        this.pendingAtk = dist < Wc.bashRange ? "bash" : (Math.random() < 0.5 ? "baton" : "mortar");
        this.state = "windup"; this.stateT = Wc.batonWindup;
      }
      if (ph === 2 && this.onGround && Math.random() < 0.5 * dt) { this.vy = -1150; this.onGround = false; }   // vault to a platform
    }
    this.integrate(dt, platforms);
  }

  _fire(player, projectiles, footY, Wc) {
    if (this.pendingAtk === "mortar") this._mortar(player, projectiles);
    else if (this.pendingAtk === "bash") {
      this._shock(projectiles, this.facing, footY);
      if (Math.abs(player.x - this.x) < Wc.bashRange + 40 && !player.invulnerable) {
        player.vx = (Math.sign(player.x - this.x) || 1) * Wc.bashKnock; player.vy = -300;
      }
    } else { this._shock(projectiles, this.facing, footY); if (this.phase >= 2) this._shock(projectiles, -this.facing, footY); }
    this.batonStrike = 0.18;   // snap the baton through on the strike
    if (typeof SFX !== "undefined" && SFX.ctx && SFX.slam) SFX.slam();
  }

  _ceiling(dt, player, projectiles, Wc) {
    this.onGround = false;
    if (this.state === "lungewind") {             // hang, lock onto a spot, telegraph the dive
      this.lungeWT -= dt;
      this.vx = lerp(this.vx, 0, clamp(6 * dt, 0, 1));
      this.x = clamp(this.x + this.vx * dt, this.hw, CONFIG.view.w - this.hw);
      if (this.lungeWT <= 0) {
        this.state = "lunge";
        const m = len(this.diveTX - this.x, this.diveTY - this.y) || 1;
        this.vx = (this.diveTX - this.x) / m * Wc.lungeSpeed;
        this.vy = (this.diveTY - this.y) / m * Wc.lungeSpeed;
      }
      return;
    }
    if (this.state === "lunge") {                 // committed diagonal dive toward the locked spot
      this.x += this.vx * dt; this.y += this.vy * dt;
      const gy = CONFIG.world.groundY;
      if (this.x <= this.hw + 4 || this.x >= CONFIG.view.w - this.hw - 4 || this.y >= gy - this.hh) {
        this.y = Math.min(this.y, gy - this.hh); this.state = "idle"; this.lungeT = Wc.lungeCd;
      }
      return;
    }
    this.lungeT -= dt;
    if (this.lungeT <= 0) {                        // commit: lock the target now, dive after a readable wind-up
      this.state = "lungewind"; this.lungeWT = Wc.lungeWindup || 0.5;
      this.diveTX = clamp(player.x, this.hw, CONFIG.view.w - this.hw); this.diveTY = player.y;
      return;
    }
    // glide along the ceiling toward the player
    this.y = lerp(this.y, Wc.ceilingY, clamp(2.5 * dt, 0, 1));
    this.vx = lerp(this.vx, (player.x - this.x) * 1.1, clamp(1.5 * dt, 0, 1));
    this.x = clamp(this.x + this.vx * dt, this.hw, CONFIG.view.w - this.hw);
    this.ceilDropT -= dt;
    if (this.ceilDropT <= 0) {                    // drop shock pulses to the floor below
      const gy = CONFIG.world.groundY;
      for (const d of [-1, 1]) { const p = new Projectile(this.x, gy - Wc.shockR, d * Wc.shockSpeed * 0.8, 0); p.shock = true; p.r = Wc.shockR; p.dmg = Wc.shockDmg; p.life = 1.6; projectiles.push(p); }
      FX.ring(this.x, gy, 12, CONFIG.colors.slam);
      this.ceilDropT = Wc.ceilDropCd;
    }
  }

  draw(ctx) {
    const x = this.x - this.hw, y = this.y - this.hh, w = this.hw * 2, h = this.hh * 2;
    const dim = this.state === "fakedeath";
    ctx.fillStyle = this.flash > 0 ? "#fff" : (dim ? "#7a1020" : this.color);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
    // animated baton (raised on wind-up, slammed through on strike; ignites crimson in P3)
    {
      const hx = this.x + this.facing * this.hw * 0.4, hy = this.y - 6, L = 58;
      const a = this.batonA, tx = hx + this.facing * Math.cos(a) * L, ty = hy + Math.sin(a) * L;
      if (!dim && Math.abs(this.batonA - this.batonPrevA) > 0.06) {   // swoosh
        ctx.fillStyle = this.phase >= 3 ? CONFIG.colors.charger : CONFIG.colors.slam; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(hx, hy);
        for (let s = 0; s <= 1; s += 0.2) { const aa = this.batonPrevA + (a - this.batonPrevA) * s; ctx.lineTo(hx + this.facing * Math.cos(aa) * L, hy + Math.sin(aa) * L); }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      }
      if (this.phase >= 3 && !dim) {   // crimson ignite glow
        ctx.strokeStyle = CONFIG.colors.charger; ctx.globalAlpha = 0.4; ctx.lineWidth = 16; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = dim ? "#555" : THEME.ink; ctx.lineWidth = 9; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = dim ? "#555" : THEME.ink; ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.fill();   // baton tip
    }
    // eye + phase pips + badge
    ctx.fillStyle = "#fff";
    ctx.fillRect(this.x + this.facing * 18 - 9, this.y - 20, 18, 13);
    for (let i = 0; i < this.phase; i++) ctx.fillRect(x + 14 + i * 18, y + h - 20, 12, 9);
    // wind-up telegraph
    if (this.state === "windup") {
      const gy = this.y + this.hh;
      ctx.strokeStyle = CONFIG.colors.slam; ctx.globalAlpha = 0.65; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
      if (this.pendingAtk === "mortar") { ctx.beginPath(); ctx.arc(this.x, this.y - this.hh - 12, 16, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(this.x, gy - 2); ctx.lineTo(this.x + this.facing * 210, gy - 2); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // ceiling-dive telegraph: a marked line from the cling to the spot it locked onto
    if (this.state === "lungewind") {
      const k = 1 - clamp(this.lungeWT / (CONFIG.warden.lungeWindup || 0.5), 0, 1);
      ctx.strokeStyle = CONFIG.colors.charger; ctx.globalAlpha = 0.4 + 0.5 * k; ctx.lineWidth = 3 + 3 * k; ctx.setLineDash([10, 8]); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(this.x, this.y + this.hh); ctx.lineTo(this.diveTX, this.diveTY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CONFIG.colors.charger; ctx.globalAlpha = 0.3 + 0.6 * k;   // target reticle
      ctx.beginPath(); ctx.arc(this.diveTX, this.diveTY, 16 - 8 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    this.drawHpBar && this.drawHpBar(ctx);   // (boss HP also shown in the HUD)
  }
}

// ---- The Iron Colossus (Stage 2 boss): tank with a front shield -> thrown sweeping arm -> molten core ----
class Colossus extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.colossus);
    this.color = CONFIG.colors.armored;
    this.kind = "boss"; this.isBoss = true; this.bossName = "THE IRON COLOSSUS";
    this.state = "idle"; this.stateT = 0; this.atkT = 2.2; this.pendingAtk = "sweep";
    this.facing = 1; this.exposed = false; this.shielded = true;
    this.phaseMarker = 1;
    this.zones = []; this.zoneColor = CONFIG.colors.slam;   // phase-3 hot floor panels (reuses the boss-zone system)
    this.crossT = 0;
  }
  get phase() { const f = this.hp / this.maxHp; return f > 0.6 ? 1 : (f > 0.25 ? 2 : 3); }
  get guardSide() { return this.facing; }
  // phase-1 front shield: only an aerial hit (you striking from above) gets through
  blocks() { return this.shielded && !this.exposed; }
  damageTakenMult() { return this.phase === 3 ? 1.35 : 1; }   // exposed core = vulnerable

  _shock(projectiles, dir) {
    const C = this.cfg, footY = this.y + this.hh;
    const p = new Projectile(this.x + dir * this.hw * 0.7, footY - C.shockR, dir * C.shockSpeed, 0);
    p.shock = true; p.r = C.shockR; p.dmg = C.shockDmg; p.life = 2.4;
    projectiles.push(p);
  }
  _throwShield(projectiles) {
    const C = this.cfg;
    const p = new Projectile(this.hw, C.sweeperY, C.sweeperSpeed, 0);
    p.shock = true; p.sweeper = true; p.r = 22; p.dmg = C.sweeperDmg; p.bounces = 999; p.life = 60;
    projectiles.push(p);
    FX.ring(this.x, this.y, 20, CONFIG.colors.armoredShield);
  }
  _crossBurst(projectiles) {
    const C = this.cfg;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const p = new Projectile(this.x, this.y, dx * C.crossSpeed, dy * C.crossSpeed);
      p.dmg = C.crossDmg; p.r = 12; projectiles.push(p);
    }
    FX.ring(this.x, this.y, 16, CONFIG.colors.boss);
  }
  _enterPhase(ph, projectiles) {
    if (ph === 2) { this.shielded = false; this._throwShield(projectiles); }
    else if (ph === 3) {
      const C = this.cfg; this.zones = [];
      for (let i = 0; i < C.panelCount; i++) this.zones.push({ x: 220 + i * (CONFIG.view.w - 440) / (C.panelCount - 1) });
      this.crossT = 1.6;
    }
  }
  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    const C = this.cfg, ph = this.phase;
    this.facing = Math.sign(player.x - this.x) || this.facing;
    this.exposed = player.y < this.y - this.hh * 0.15;   // attacking from above
    if (ph !== this.phaseMarker) { this._enterPhase(ph, projectiles); this.phaseMarker = ph; }
    if (ph === 3) { this.crossT -= dt; if (this.crossT <= 0) { this._crossBurst(projectiles); this.crossT = C.crossCd; } }

    if (this.state === "charge") {                    // shoulder charge crosses the arena (no gravity)
      this.x += this.vx * dt;
      if (this.x <= this.hw + 4 || this.x >= CONFIG.view.w - this.hw - 4) { this.state = "recover"; this.stateT = 1.0; this.stun = 0.7; }
      return;
    }
    if (this.state === "windup") {
      this.vx = lerp(this.vx, 0, clamp(8 * dt, 0, 1)); this.stateT -= dt;
      if (this.stateT <= 0) this._fire(player, projectiles, C, ph);
    } else if (this.state === "recover") {
      this.vx = lerp(this.vx, 0, clamp(6 * dt, 0, 1)); this.stateT -= dt; if (this.stateT <= 0) this.state = "idle";
    } else {
      this.vx = lerp(this.vx, this.facing * C.speed * (1 + (ph - 1) * 0.3), clamp(2.5 * dt, 0, 1));
      this.atkT -= dt;
      if (this.atkT <= 0) {
        this.pendingAtk = ["sweep", "stomp", "charge"][Math.floor(Math.random() * 3)];
        this.state = "windup"; this.stateT = this.pendingAtk === "charge" ? C.chargeWindup : C.windup;
      }
      if (ph === 2 && this.onGround && Math.random() < 0.3 * dt) { this.vy = -1000; this.onGround = false; }
    }
    this.integrate(dt, platforms);
  }
  _fire(player, projectiles, C, ph) {
    const a = this.pendingAtk;
    if (a === "stomp") { this._shock(projectiles, 1); this._shock(projectiles, -1); this.state = "idle"; this.atkT = C.atkCd / (1 + (ph - 1) * 0.25); }
    else if (a === "sweep") { this._shock(projectiles, this.facing); this.state = "idle"; this.atkT = C.atkCd / (1 + (ph - 1) * 0.25); }
    else { this.state = "charge"; this.vx = this.facing * C.chargeSpeed; }   // charges along its own (ground) level — telegraphed during wind-up, no teleport
    if (typeof SFX !== "undefined" && SFX.ctx && SFX.slam) SFX.slam();
  }
  draw(ctx) {
    const x = this.x - this.hw, y = this.y - this.hh, w = this.hw * 2, h = this.hh * 2, ph = this.phase;
    // body (heavy plating + rivets)
    ctx.fillStyle = this.flash > 0 ? "#fff" : (this.stun > 0 ? "#9aa6b2" : this.color);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 5; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = THEME.ink;
    for (let i = 0; i < 4; i++) { ctx.fillRect(x + 8 + i * (w - 24) / 3, y + 8, 5, 5); ctx.fillRect(x + 8 + i * (w - 24) / 3, y + h - 13, 5, 5); }
    // eye
    ctx.fillStyle = "#fff"; ctx.fillRect(this.x + this.facing * 26 - 12, this.y - 28, 24, 16);
    // front shield (phase 1) or exposed molten core (phase 3)
    if (this.shielded) {
      const gx = this.x + this.facing * (this.hw + 12);
      ctx.fillStyle = CONFIG.colors.armoredShield;
      ctx.fillRect(gx - 6, y - 8, 12, h + 16);
      ctx.fillRect(gx - this.facing * 10 - 1, y - 8, this.facing * 11, 8);
      ctx.fillRect(gx - this.facing * 10 - 1, y + h + 1, this.facing * 11, 8);
    } else if (ph === 3) {
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 120);
      ctx.fillStyle = CONFIG.colors.boss; ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(this.x, this.y + 6, 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = CONFIG.colors.slam; ctx.lineWidth = 3; ctx.stroke();
    }
    // wind-up telegraph
    if (this.state === "windup") {
      const gy = this.y + this.hh, k = 1 - clamp(this.stateT / (this.pendingAtk === "charge" ? this.cfg.chargeWindup : this.cfg.windup), 0, 1);
      if (this.pendingAtk === "charge") { chargeTelegraph(ctx, this.x, this.y, this.hh, this.facing, k, CONFIG.colors.slam); }
      else {
        ctx.strokeStyle = CONFIG.colors.slam; ctx.globalAlpha = 0.35 + 0.5 * k; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
        if (this.pendingAtk === "stomp") { ctx.beginPath(); ctx.moveTo(this.x - (60 + 180 * k), gy - 2); ctx.lineTo(this.x + (60 + 180 * k), gy - 2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(this.x, gy - 2); ctx.lineTo(this.x + this.facing * (60 + 200 * k), gy - 2); ctx.stroke(); }
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    }
  }
}

// ---- The Berserker King / Aldric (Stage 3 boss): a duel -> a throne of fire -> a fake death & frenzy ----
class Aldric extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.aldric);
    this.color = CONFIG.colors.charger;
    this.kind = "boss"; this.isBoss = true; this.bossName = "THE BERSERKER KING";
    this.mode = "duel"; this.state = "idle"; this.stateT = 0; this.atkT = 1.6; this.facing = 1;
    this.zones = []; this.zoneColor = CONFIG.colors.bomber; this.zoneCycleT = 0;   // checkerboard fire
    this.spawnAdds = false; this.faked = false; this.reviveCap = 0; this.chargeT = 0;
    this.weaponA = -0.6; this.weaponPrevA = -0.6;
  }
  damageTakenMult() { return this.mode === "frenzy" ? CONFIG.aldric.frenzyDmgTaken : (this.mode === "downed" ? CONFIG.aldric.downedDmgTaken : 1); }
  // during the fake he can't be killed (hit OR DoT) — he always rises into the frenzy
  _deathLocked() { return this.mode === "downed"; }

  _shock(projectiles, dir, fire) {
    const C = CONFIG.aldric, footY = this.y + this.hh;
    const p = new Projectile(this.x + dir * this.hw * 0.7, footY - C.shockR, dir * C.shockSpeed, 0);
    p.shock = true; p.r = C.shockR; p.dmg = C.shockDmg; p.life = 2.0;
    projectiles.push(p);
  }
  _lightFire() {
    const C = CONFIG.aldric, colW = CONFIG.view.w / C.fireCols; this.zones = [];
    for (let i = 0; i < C.fireCols; i++) this.zones.push({ x: (i + 0.5) * colW, on: i % 2 === 0 });
    this.zoneCycleT = C.fireCycle;
  }

  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    const C = CONFIG.aldric;
    this.facing = Math.sign(player.x - this.x) || this.facing;
    this._animWeapon(dt);
    const f = this.hp / this.maxHp;
    if (this.mode === "duel" && f < C.fireTier) { this.mode = "fire"; this._lightFire(); }
    if (this.mode === "fire" && f < C.fakeTier && !this.faked) { this._enterDowned(); }
    // checkerboard pulse
    if (this.zones.length) { this.zoneCycleT -= dt; if (this.zoneCycleT <= 0) { for (const z of this.zones) z.on = !z.on; this.zoneCycleT = C.fireCycle; } }

    if (this.mode === "downed") {   // the fake: kneel and regenerate while you fight the adds
      this.vx = lerp(this.vx, 0, clamp(6 * dt, 0, 1));
      this.hp = Math.min(this.reviveCap, this.hp + this.maxHp * C.regenRate * dt);
      this.integrate(dt, platforms);
      return;
    }

    const spd = C.speed * (this.mode === "frenzy" ? 1.5 : (this.mode === "fire" ? 1.2 : 1));
    if (this.mode === "frenzy") { this.chargeT -= dt; if (this.chargeT <= 0 && this.state === "idle") { this.state = "chargewind"; this.stateT = C.chargeWindup; this.chargeT = C.chargeCd; } }

    if (this.state === "chargewind") {            // plant, roar, telegraph the lane — then explode forward
      this.vx = lerp(this.vx, 0, clamp(9 * dt, 0, 1)); this.stateT -= dt;
      if (this.stateT <= 0) { this.state = "charge"; this.vx = this.facing * C.chargeSpeed; }
      this.integrate(dt, platforms);
      return;
    }
    if (this.state === "charge") {
      this.x += this.vx * dt;
      if (this.x <= this.hw + 4 || this.x >= CONFIG.view.w - this.hw - 4) { this.state = "recover"; this.stateT = 0.7; }
      return;
    }
    if (this.state === "windup") {
      this.vx = lerp(this.vx, 0, clamp(9 * dt, 0, 1)); this.stateT -= dt;
      if (this.stateT <= 0) this._strike(player, projectiles);
    } else if (this.state === "lunge") {
      this.stateT -= dt; if (this.stateT <= 0) { this.state = "recover"; this.stateT = 0.35; }
    } else if (this.state === "recover") {
      this.vx = lerp(this.vx, 0, clamp(7 * dt, 0, 1)); this.stateT -= dt; if (this.stateT <= 0) this.state = "idle";
    } else {
      this.vx = lerp(this.vx, this.facing * spd, clamp(4 * dt, 0, 1));
      this.atkT -= dt;
      if (this.atkT <= 0 && Math.abs(player.x - this.x) < 500) { this.state = "windup"; this.stateT = C.windup; }
      if (this.onGround && player.y < this.y - 60 && Math.random() < (this.mode === "duel" ? 0.3 : 0.6) * dt) { this.vy = -1120; this.onGround = false; }
    }
    this.integrate(dt, platforms);
  }
  _strike(player, projectiles) {
    const C = CONFIG.aldric;
    this._shock(projectiles, this.facing);
    this.state = "lunge"; this.stateT = 0.25; this.vx = this.facing * C.lungeSpeed;
    this.atkT = C.atkCd / (this.mode === "frenzy" ? 1.7 : (this.mode === "fire" ? 1.25 : 1));
    if (typeof SFX !== "undefined" && SFX.ctx && SFX.slam) SFX.slam();
  }
  _enterDowned() { this.mode = "downed"; this.state = "idle"; this.spawnAdds = true; this.reviveCap = this.maxHp * CONFIG.aldric.reviveFrac; this.vx = 0; this.zones = []; }
  // called by the game when the adds are cleared
  revive() { this.mode = "frenzy"; this.faked = true; this.state = "idle"; this.atkT = 0.5; this.chargeT = CONFIG.aldric.chargeCd * 0.5; this._lightFire(); }
  _animWeapon(dt) {
    let wt = -0.6, k = 9;
    if (this.state === "windup" || this.state === "chargewind") { wt = -1.5; k = 11; }
    else if (this.state === "lunge" || this.state === "charge") { wt = 0.8; k = 28; }
    this.weaponPrevA = this.weaponA; this.weaponA = lerp(this.weaponA, wt, clamp(k * dt, 0, 1));
  }
  draw(ctx) {
    const x = this.x - this.hw, y = this.y - this.hh, w = this.hw * 2, h = this.hh * 2;
    const downed = this.mode === "downed", frenzy = this.mode === "frenzy";
    // regen glow during the fake
    if (downed) {
      const pulse = 0.3 + 0.3 * Math.sin(performance.now() / 150);
      ctx.fillStyle = CONFIG.colors.charger; ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.hw + 14, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (frenzy) {   // burning aura
      ctx.fillStyle = CONFIG.colors.bomber; ctx.globalAlpha = 0.2 + 0.1 * Math.sin(performance.now() / 90);
      ctx.fillRect(x - 6, y - 6, w + 12, h + 12); ctx.globalAlpha = 1;
    }
    // body — squat when downed
    const by = downed ? y + h * 0.3 : y, bh = downed ? h * 0.7 : h;
    ctx.fillStyle = this.flash > 0 ? "#fff" : (downed ? "#7a1320" : this.color);
    ctx.fillRect(x, by, w, bh);
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 4; ctx.strokeRect(x, by, w, bh);
    // eye
    ctx.fillStyle = "#fff"; ctx.fillRect(this.x + this.facing * 16 - 8, by + 14, 16, 11);
    // cleaver (gone in frenzy — fights barehanded; animated otherwise)
    if (!frenzy && !downed) {
      const hx = this.x + this.facing * this.hw * 0.5, hy = this.y - 4, L = 64, a = this.weaponA;
      const tx = hx + this.facing * Math.cos(a) * L, ty = hy + Math.sin(a) * L;
      if (Math.abs(this.weaponA - this.weaponPrevA) > 0.05) {   // swoosh
        ctx.fillStyle = this.mode === "fire" ? CONFIG.colors.bomber : CONFIG.colors.charger; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(hx, hy);
        for (let s = 0; s <= 1; s += 0.2) { const aa = this.weaponPrevA + (a - this.weaponPrevA) * s; ctx.lineTo(hx + this.facing * Math.cos(aa) * L, hy + Math.sin(aa) * L); }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = THEME.ink; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.atan2(ty - hy, tx - hx)); ctx.fillStyle = THEME.ink;
      ctx.fillRect(-6, -14, 26, 28); ctx.restore();   // big cleaver head
    }
    // frenzy charge telegraph: the lane he's about to barrel down
    if (this.state === "chargewind") {
      const k = 1 - clamp(this.stateT / (CONFIG.aldric.chargeWindup || 0.5), 0, 1);
      chargeTelegraph(ctx, this.x, this.y, this.hh, this.facing, k, CONFIG.colors.charger);
    }
  }
}

// ---- The Echo (Stage 4 boss): your own silhouette — mirrors your last trick -> splits -> goes invisible ----
class Echo extends Enemy {
  constructor(x, y, isClone) {
    super(x, y, CONFIG.echo);
    this.color = "#000";
    this.kind = "boss"; this.isBoss = !isClone; this.bossName = "THE ECHO";
    this.isClone = !!isClone;
    this.mode = "mirror"; this.state = "idle"; this.stateT = 0; this.facing = 1;
    this.seenTrickT = 0; this.copyKind = "hit"; this.copyT = -1; this.lastCopied = "";
    this.phaseMarker = 1; this.spawnClone = false;
    this.whiteFlash = 0; this.invisT = CONFIG.echo.invisCycle; this.lungeCd = 1.3;
    this.copyOffset = isClone ? 1.7 : 1;   // the clone mirrors on a longer, offset delay
    if (isClone) { this.hp *= 0.5; this.maxHp = this.hp; this.hpDisplay = this.hp; }
  }
  get phase() { const f = this.hp / this.maxHp; return f > 0.6 ? 1 : (f > 0.25 ? 2 : 3); }
  _shock(projectiles, dir) {
    const C = CONFIG.echo, footY = this.y + this.hh;
    const p = new Projectile(this.x + dir * this.hw, footY - 12, dir * C.shockSpeed, 0);
    p.shock = true; p.r = 14; p.dmg = C.shockDmg; p.life = 1.6; projectiles.push(p);
  }
  _shot(player, projectiles) {
    const C = CONFIG.echo, dx = player.x - this.x, dy = player.y - this.y, m = len(dx, dy) || 1;
    const p = new Projectile(this.x, this.y, (dx / m) * C.projSpeed, (dy / m) * C.projSpeed); p.dmg = C.projDmg; p.r = 10; p.tint = this.color; projectiles.push(p);
  }
  _scheduleFrom(player) {   // a new trick from the player queues a copy (faster if you repeat yourself)
    if (player.lastTrickT > this.seenTrickT) {
      const repeat = player.lastTrickKind === this.lastCopied;
      this.seenTrickT = player.lastTrickT; this.copyKind = player.lastTrickKind;
      this.copyT = CONFIG.echo.copyDelay * this.copyOffset * (repeat ? 0.5 : 1);
    }
  }
  _doCopy(player, projectiles) {
    const k = this.copyKind, dir = Math.sign(player.x - this.x) || this.facing;
    this.lastCopied = k;
    if (k === "throwHit" || k === "parry" || k === "deflect") { this._shot(player, projectiles); this.state = "recover"; this.stateT = 0.4; }
    else if (k === "slam" || k === "superslam" || k === "spike") { this._shock(projectiles, 1); this._shock(projectiles, -1); this.state = "recover"; this.stateT = 0.5; }
    else if (k === "updraft" || k === "launch") { this.state = "lunge"; this.stateT = 0.3; this.vx = dir * 560; this.vy = -720; }
    else { this.state = "lunge"; this.stateT = 0.24; this.vx = dir * 920; }   // hit / default melee dash
    if (typeof SFX !== "undefined" && SFX.ctx && SFX.hit) SFX.hit(false);
  }
  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    this.facing = Math.sign(player.x - this.x) || this.facing;
    if (!this.isClone) {
      const ph = this.phase;
      if (ph !== this.phaseMarker) {
        if (ph === 2) this.spawnClone = true;
        if (ph === 3) this.mode = "invert";
        this.phaseMarker = ph;
      }
    }
    if (this.mode === "invert") { this._invert(dt, player, projectiles); return; }

    // ---- mirror mode (phases 1-2) ----
    this._scheduleFrom(player);
    if (this.copyT > 0) { this.copyT -= dt; if (this.copyT <= 0) this._doCopy(player, projectiles); }
    if (this.state === "lunge") { this.stateT -= dt; if (this.stateT <= 0) { this.state = "recover"; this.stateT = 0.3; } }
    else if (this.state === "recover") { this.vx = lerp(this.vx, 0, clamp(8 * dt, 0, 1)); this.stateT -= dt; if (this.stateT <= 0) this.state = "idle"; }
    else { const targetX = player.x - this.facing * (this.isClone ? 260 : 200); this.vx = lerp(this.vx, (targetX - this.x) * 2, clamp(3 * dt, 0, 1)); }
    this.integrate(dt, platforms);
  }
  _invert(dt, player, projectiles) {
    const C = CONFIG.echo;
    this.invisT -= dt;
    if (this.invisT <= 0) {
      if (this.whiteFlash < 0.5) { this.whiteFlash = 1; this.invisT = C.invisDur; }   // blinding white-out -> nearly invisible
      else { this.whiteFlash = 0; this.invisT = C.invisCycle; }
    }
    if (this.state === "aim") {                  // lock a spot + flash a line, THEN dive (so it never just appears on you)
      this.aimT -= dt;
      this.vx = lerp(this.vx, 0, clamp(7 * dt, 0, 1)); this.vy = lerp(this.vy, 0, clamp(7 * dt, 0, 1));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.aimT <= 0) {
        this.state = "lunge"; this.stateT = 0.34;
        const m = len(this.diveTX - this.x, this.diveTY - this.y) || 1;
        this.vx = (this.diveTX - this.x) / m * C.lungeSpeed; this.vy = (this.diveTY - this.y) / m * C.lungeSpeed;
      }
    } else if (this.state === "lunge") {
      this.x += this.vx * dt; this.y += this.vy * dt; this.stateT -= dt;
      if (this.stateT <= 0) { this.state = "idle"; this.lungeCd = 0.9 + Math.random() * 0.6; }
    } else {
      const tx = player.x, ty = player.y - 90;   // drift above/around you, then commit a dive
      this.vx = lerp(this.vx, (tx - this.x) * 1.6, clamp(2 * dt, 0, 1));
      this.vy = lerp(this.vy, (ty - this.y) * 1.6, clamp(2 * dt, 0, 1));
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.lungeCd -= dt;
      if (this.lungeCd <= 0 && Math.abs(player.x - this.x) < 820) {
        this.state = "aim"; this.aimT = 0.32; this.diveTX = player.x; this.diveTY = player.y;
      }
    }
    this.x = clamp(this.x, this.hw, CONFIG.view.w - this.hw);
    this.y = clamp(this.y, 50, CONFIG.world.groundY - this.hh);
    this.onGround = false;
  }
  draw(ctx) {
    const x = this.x - this.hw, y = this.y - this.hh, w = this.hw * 2, h = this.hh * 2;
    ctx.globalAlpha = 1 - this.whiteFlash * 0.88;   // near-invisible during a white-out
    // your silhouette + cyan visor + a faint blade
    ctx.fillStyle = this.flash > 0 ? "#fff" : (this.isClone ? "#3a3a3a" : THEME.ink);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = CONFIG.colors.eye; ctx.fillRect(this.x + this.facing * 5 - 4, y + 12, 8, 5);
    ctx.strokeStyle = THEME.ink; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.facing * 22, this.y - 26); ctx.stroke();
    ctx.globalAlpha = 1;
    // dive telegraph — always visible (even mid white-out) so the dive is readable
    if (this.state === "aim") {
      const k = 1 - clamp(this.aimT / 0.32, 0, 1);
      ctx.strokeStyle = CONFIG.colors.eye; ctx.globalAlpha = 0.5 + 0.4 * k; ctx.lineWidth = 2 + 3 * k; ctx.setLineDash([9, 7]); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.diveTX, this.diveTY); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(this.diveTX, this.diveTY, 18 - 9 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    this.drawHpBar(ctx);
  }
}

// ---- The Source (Stage 5 FINAL boss): cycles every fallen boss's mechanic, collapses
//      the floor, fakes its death, then erupts into a true form. Reuses the boss-zone
//      hazard system + the generic fake-death-adds-revive handler in game.js. ----
class Source extends Enemy {
  constructor(x, y) {
    super(x, y, CONFIG.source);
    this.color = "#8b3bd6"; this.kind = "boss"; this.isBoss = true; this.bossName = "THE SOURCE";
    this.mode = "cycle"; this.atkT = 2.2; this.castIdx = 0; this.facing = 1;
    this.zones = []; this.zoneColor = CONFIG.colors.bomber; this.zoneCycleT = 0;
    this.collapsing = false; this.collapseT = 0; this.faked = false; this.spawnAdds = false; this.reviveCap = 0;
    this.seenTrickT = 0; this.copyKind = "hit"; this.copyT = -1; this.lastCopied = ""; this.copyOffset = 1;
    this.downText = "...not yet"; this.reviveText = "TRUE FORM";
  }
  damageTakenMult() { return this.mode === "final" ? 1.2 : (this.mode === "downed" ? 0.3 : 1); }
  _deathLocked() { return this.mode === "downed"; }   // fake-death kneel: neither hit nor DoT may kill before revival

  _shot(player, projectiles) {
    const C = CONFIG.source, dx = player.x - this.x, dy = player.y - this.y, m = len(dx, dy) || 1;
    const p = new Projectile(this.x, this.y, (dx / m) * C.shockSpeed, (dy / m) * C.shockSpeed); p.dmg = C.shockDmg; p.r = 11; p.tint = this.color; projectiles.push(p);
  }
  _shock(projectiles, dir, footY) {
    const C = CONFIG.source, fy = (footY || CONFIG.world.groundY) - C.shockR;
    const p = new Projectile(this.x + dir * this.hw, fy, dir * C.shockSpeed, 0);
    p.shock = true; p.r = C.shockR; p.dmg = C.shockDmg; p.life = 2.0; projectiles.push(p);
  }
  _sweeper(projectiles) {
    const C = CONFIG.source;
    const p = new Projectile(this.hw, CONFIG.world.groundY - 24, C.sweeperSpeed, 0);
    p.shock = true; p.sweeper = true; p.r = 22; p.dmg = C.sweeperDmg; p.bounces = 999; p.life = 60; projectiles.push(p);
    FX.ring(this.x, this.y, 18, CONFIG.colors.armoredShield);
  }
  _cross(projectiles) {
    const C = CONFIG.source;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
      const p = new Projectile(this.x, this.y, dx * C.crossSpeed, dy * C.crossSpeed); p.dmg = C.crossDmg; p.r = 11; p.tint = this.color; projectiles.push(p);
    }
    FX.ring(this.x, this.y, 16, this.color);
  }
  _lightFire() {
    const A = CONFIG.aldric, colW = CONFIG.view.w / A.fireCols; this.zones = [];
    for (let i = 0; i < A.fireCols; i++) this.zones.push({ x: (i + 0.5) * colW, on: i % 2 === 0 });
    this.zoneCycleT = A.fireCycle;
  }
  // Echo-style mirror: copy the player's last trick as a void attack
  _scheduleFrom(player) {
    if (player.lastTrickT > this.seenTrickT) {
      const repeat = player.lastTrickKind === this.lastCopied;
      this.seenTrickT = player.lastTrickT; this.copyKind = player.lastTrickKind;
      this.copyT = CONFIG.source.copyDelay * (repeat ? 0.5 : 1);
    }
  }
  _doCopy(player, projectiles) {
    const k = this.copyKind; this.lastCopied = k;
    if (k === "slam" || k === "superslam" || k === "spike") { this._shock(projectiles, 1); this._shock(projectiles, -1); }
    else this._shot(player, projectiles);
    FX.ring(this.x, this.y, 13, this.color);
  }
  _cast(projectiles, count) {
    const picks = ["warden", "colossus", "aldric"];
    for (let i = 0; i < count; i++) {
      const m = picks[(this.castIdx++) % picks.length];
      if (m === "warden") { this._shock(projectiles, 1); this._shock(projectiles, -1); }
      else if (m === "colossus") this._sweeper(projectiles);
      else this._lightFire();
    }
    if (this.mode === "final") this._cross(projectiles);
    FX.ring(this.x, this.y, 20, this.color);
  }
  _hover(dt, player) {
    const tx = player.x, ty = Math.min(player.y - 70, CONFIG.world.groundY - 200);
    this.vx = lerp(this.vx, (tx - this.x) * 1.3, clamp(2 * dt, 0, 1));
    this.vy = lerp(this.vy, (ty - this.y) * 1.3, clamp(2 * dt, 0, 1));
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.x = clamp(this.x, this.hw, CONFIG.view.w - this.hw);
    this.y = clamp(this.y, 70, CONFIG.world.groundY - this.hh);
    this.onGround = false;
  }
  _enterDowned() {
    this.mode = "downed"; this.faked = true; this.spawnAdds = true; this.collapsing = false;
    this.reviveCap = this.maxHp * CONFIG.source.reviveFrac; this.vx = 0; this.zones = [];
  }
  revive() { this.mode = "final"; this.atkT = 0.4; this.color = CONFIG.colors.perfect; this.castIdx = 0; this._lightFire(); }

  update(dt, platforms, player, projectiles) {
    this.tickTimers(dt);
    this.facing = Math.sign(player.x - this.x) || this.facing;
    const C = CONFIG.source, f = this.hp / this.maxHp;

    if (this.mode === "downed") {   // the fake: kneel + regen, passive (game spawns adds; revive() on their death)
      this.hp = Math.min(this.reviveCap, this.hp + this.maxHp * C.regenRate * dt);
      this.vx = lerp(this.vx, 0, clamp(4 * dt, 0, 1));
      this.y = lerp(this.y, CONFIG.world.groundY - this.hh - 10, clamp(2 * dt, 0, 1));
      return;
    }
    if (this.zones.length) { this.zoneCycleT -= dt; if (this.zoneCycleT <= 0) { for (const z of this.zones) z.on = !z.on; this.zoneCycleT = CONFIG.aldric.fireCycle; } }
    this._scheduleFrom(player);
    if (this.copyT > 0) { this.copyT -= dt; if (this.copyT <= 0) this._doCopy(player, projectiles); }

    if (this.mode === "cycle") {
      if (f < C.fakeTier && !this.faked) { this._enterDowned(); return; }
      if (f < C.floorTier && !this.collapsing) { this.collapsing = true; this.collapseT = 0.5; }
    }
    // THE FLOOR FALLS AWAY: rip out the one-way platforms one by one
    if (this.collapsing) {
      this.collapseT -= dt;
      if (this.collapseT <= 0) {
        this.collapseT = C.collapseCd;
        const ow = platforms.filter((p) => p.oneway);
        if (ow.length) { const pl = ow[Math.floor(Math.random() * ow.length)], idx = platforms.indexOf(pl); if (idx >= 0) { platforms.splice(idx, 1); FX.ring(pl.x + pl.w / 2, pl.y, 18, this.color); FX.burst(pl.x + pl.w / 2, pl.y, 0, 1, 8, this.color); } }
      }
    }

    this._hover(dt, player);
    this.atkT -= dt;
    if (this.atkT <= 0) {
      this.atkT = C.cycleCd / (this.mode === "final" ? 1.9 : (this.collapsing ? 1.35 : 1));
      this._cast(projectiles, this.mode === "final" ? 2 : 1);
    }
  }

  draw(ctx) {
    const t = performance.now(), x = this.x, y = this.y, w = this.hw, h = this.hh;
    const core = this.mode === "final" ? CONFIG.colors.perfect : (this.mode === "downed" ? "#4a4a55" : this.color);
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.1 * Math.sin(t / 200); ctx.fillStyle = THEME.ink;
    ctx.beginPath(); ctx.ellipse(x, y, w * 1.45, h * 1.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(x, y);
    const spin = this.mode === "downed" ? 0 : (this.mode === "final" ? t / 280 : t / 700);
    ctx.rotate(spin);
    ctx.fillStyle = this.flash > 0 ? "#fff" : "#191328";
    ctx.beginPath();
    const pts = 10;
    for (let i = 0; i < pts; i++) { const a = i / pts * Math.PI * 2, r = (i % 2 ? w : w * 0.6) * (1 + 0.07 * Math.sin(t / 110 + i)); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = core; ctx.lineWidth = 3; ctx.stroke();
    ctx.rotate(-spin);
    const cr = w * 0.34 * (0.8 + 0.2 * Math.sin(t / 100));
    ctx.globalAlpha = 0.9; ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.7; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, cr * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    this.drawHpBar(ctx);
  }
}


export {
  clamp, lerp, len, lerpAngle, segPointDist, chargeTelegraph,
  CONFIG,
  FX, Projectile,
  applyVariant,
  Enemy, Charger, Ranged, Flyer, Bomber, Armored, Boss, Support, Wraith, Chimera, Warden, Colossus, Aldric, Echo, Source
};
