import {
  CONFIG,
  FX, Projectile,
  VARIANTS, applyVariant,
  Enemy, Charger, Ranged, Flyer, Bomber, Armored, Support, Wraith, Chimera, Warden, Colossus, Aldric, Echo, Source
} from './game-engine.js';

// Setup Mock Globals
window.CONFIG = CONFIG;
window.THEME = { ink: "#0a0a0d", rim: "#1a1a24" };
window.UI = { font: (size, bold) => `${bold ? 'bold' : 'normal'} ${size}px monospace` };
window.SFX = {
  slam: () => {}, play: () => {}, hit: () => {}, deflect: () => {}, pop: () => {}
};
window.player = { x: 0, y: -200, hp: 100, maxHp: 100, iframes: 0, trickMult: 1, vx: 0, vy: 0 };
window.platforms = [];
window.projectiles = [];
// FX is handled by FX.list inside the game engine

export function initModelViewer(canvas, modelName, variant, state = { timeScale: 1, phase: 'auto', debug: false }) {
  // Expand universe to prevent projectile culling/bouncing in the cinematic viewer
  if (window.CONFIG) {
    window.CONFIG.view.w = 10000;
    window.CONFIG.view.h = 10000;
    window.CONFIG.world.groundY = 10000;
  }
  const simX = 5000;
  const simY = 5000;

  const ctx = canvas.getContext('2d');
  let rafId;
  let lastTime = performance.now();
  
  let hoverK = 0; 
  let isHovered = false;
  let mouseX = 0, mouseY = 0;
  
  // Camera State
  let camScale = 1.0;
  let realCamX = simX;
  let realCamY = simY;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
  
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas.parentElement);

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isHovered = true;
  });
  canvas.addEventListener('mouseleave', () => { 
    isHovered = false; 
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault()); // Prevent right click menu

  // Interactive Striking (Left Click)
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && enemyInstance && enemyInstance.hit) {
      // Simulate a generic sword strike (25 damage, knockback away from mouse)
      const dirX = Math.sign(enemyInstance.x - window.player.x) * 400 || 400;
      enemyInstance.hit(25, dirX, -100);
      if(FX.spark) FX.spark(window.player.x, window.player.y, dirX, -100, "#fff"); // Impact spark
    }
  });

  const MAP = {
    charger: Charger, ranged: Ranged, flyer: Flyer, bomber: Bomber,
    armored: Armored, support: Support, wraith: Wraith, chimera: Chimera,
    warden: Warden, "iron-colossus": Colossus, aldric: Aldric, "the-echo": Echo, "the-source": Source
  };
  
  const Cls = MAP[modelName] || Enemy;
  let enemyInstance;
  const isBoss = (modelName === "the-source" || modelName === "iron-colossus" || modelName === "aldric" || modelName === "the-echo" || modelName === "warden");
  
  if (isBoss) {
    enemyInstance = new Cls(simX, simY, CONFIG[modelName.replace("iron-","").replace("the-","")] || CONFIG.boss);
  } else {
    enemyInstance = new Cls(simX, simY, CONFIG[modelName] || CONFIG.charger);
  }
  
  if (variant) {
    let variantObj = null;
    for (const family in VARIANTS) {
      const found = VARIANTS[family].find(v => v.id === variant);
      if (found) { variantObj = found; break; }
    }
    if (variantObj) {
      applyVariant(enemyInstance, variantObj);
    }
  }

  const COLORS = {
    charger: "#e23b3b", ranged: "#2f6df0", flyer: "#8b3bd6", bomber: "#ef8a17",
    armored: "#3a4654", support: "#a64dd6", chimera: "#d613c4", wraith: "#272a30",
    "iron-colossus": "#b01030", aldric: "#b01030", "the-echo": "#b01030", "the-source": "#b01030", warden: "#b01030"
  };
  if (!enemyInstance.color) enemyInstance.color = COLORS[modelName] || "#ff0000";

  let engineTime = 0;

  function drawAnnotation(x, y, tx, ty, text, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx + 40, ty);
    ctx.stroke();
    
    ctx.font = '10px monospace';
    ctx.fillText(text, tx, ty - 5);
  }

  function render(timestamp) {
    rafId = requestAnimationFrame(render);
    
    // Calculate raw DT, then apply Time Dilator
    let rawDt = (timestamp - lastTime) / 1000;
    if (rawDt > 0.1) rawDt = 0.1;
    lastTime = timestamp;
    
    const dt = rawDt * state.timeScale;
    engineTime += dt;
    
    hoverK += (isHovered ? 1 : -1) * (rawDt / 0.15);
    hoverK = Math.max(0, Math.min(1, hoverK));

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dpr = window.devicePixelRatio || 1;
    
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Smart Camera Tracking
    // Lerp camera towards the enemy
    const camSpeed = 8 * dt; // Spring stiffness
    realCamX += (enemyInstance.x - realCamX) * camSpeed;
    realCamY += (enemyInstance.y - realCamY) * camSpeed;
    
    // Dynamic Action Zoom
    const enemySpeed = Math.sqrt((enemyInstance.vx || 0)**2 + (enemyInstance.vy || 0)**2);
    let actionZoom = 1.0 - (enemySpeed * 0.00015);
    actionZoom = Math.max(0.75, Math.min(1.0, actionZoom));
    
    const finalScale = 1.5 * state.camScale * actionZoom;

    // Transform mouse coordinates into simulation coordinates for the player
    // We reverse the camera transform to find where the mouse is in world space
    const worldMouseX = (mouseX - cx) / finalScale + realCamX;
    const worldMouseY = (mouseY - cy) / finalScale + realCamY;
    
    window.player.x = worldMouseX;
    window.player.y = worldMouseY;
    
    // Fake the ground
    enemyInstance.onGround = !enemyInstance.cfg.hoverY;

    // Boss Phase Showcase Logic
    if (isBoss) {
      if (state.phase === 'auto') {
        const cycleTime = 12;
        const loopTime = engineTime % cycleTime;
        if (loopTime < dt) {
          window.projectiles = [];
          FX.list = [];
          if (enemyInstance.zones) enemyInstance.zones = [];
        }
        // Drain HP from 100% down to 1% over the cycle
        enemyInstance.hp = Math.max(1, enemyInstance.maxHp * (1 - loopTime / cycleTime));
      } else {
        // Explicit Phase Override
        const p = parseInt(state.phase);
        // Bosses phases: >0.65 Phase 1, >0.30 Phase 2, <0.30 Phase 3
        if (p === 1) enemyInstance.hp = enemyInstance.maxHp * 0.99;
        if (p === 2) enemyInstance.hp = enemyInstance.maxHp * 0.60;
        if (p === 3) enemyInstance.hp = enemyInstance.maxHp * 0.20;
      }
    }

    // Simulate engine
    enemyInstance.update(dt, window.platforms, window.player, window.projectiles);

    // Simulate Projectiles natively
    window.projectiles = window.projectiles.filter(p => !p.dead && p.life > 0);
    window.projectiles.forEach(p => p.update(dt));

    // Simulate Particles natively
    if (FX.update) FX.update(dt);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(finalScale, finalScale);
    ctx.translate(-realCamX, -realCamY); // Center exactly on the tracking camera
    
    // Draw all natively
    window.projectiles.forEach(p => {
      if (p.draw) p.draw(ctx);
    });

    // Draw Particles natively
    if (FX.draw) FX.draw(ctx);

    enemyInstance.draw(ctx);
    
    // Schematic annotations layer
    if (hoverK > 0) {
      ctx.globalAlpha = hoverK;
      const stateStr = enemyInstance.state || enemyInstance.atk || enemyInstance.mode || "idle";
      let cueColor = "#15c2c2";
      if (enemyInstance.color && enemyInstance.color !== "#000") cueColor = enemyInstance.color;
      
      drawAnnotation(enemyInstance.x + enemyInstance.hw, enemyInstance.y - enemyInstance.hh, enemyInstance.x + 50, enemyInstance.y - 50, `[STATE: ${stateStr.toUpperCase()}]`, cueColor);
      drawAnnotation(enemyInstance.x - enemyInstance.hw, enemyInstance.y - enemyInstance.hh, enemyInstance.x - 50, enemyInstance.y - 50, `[HP: ${Math.floor(enemyInstance.hp)}]`, "#fff");
      ctx.globalAlpha = 1;
    }
    
    // Debug Telemetry Overlay
    if (state.debug) {
      ctx.lineWidth = 1;
      
      // Hitbox
      ctx.strokeStyle = "#ff00ff";
      ctx.strokeRect(enemyInstance.x - enemyInstance.hw, enemyInstance.y - enemyInstance.hh, enemyInstance.hw * 2, enemyInstance.hh * 2);
      
      // Velocity Vector
      ctx.strokeStyle = "#00ff00";
      ctx.beginPath();
      ctx.moveTo(enemyInstance.x, enemyInstance.y);
      ctx.lineTo(enemyInstance.x + (enemyInstance.vx || 0) * 0.2, enemyInstance.y + (enemyInstance.vy || 0) * 0.2);
      ctx.stroke();
      
      // Projectile Hitboxes
      ctx.strokeStyle = "#ffff00";
      window.projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r || 6, 0, Math.PI * 2);
        ctx.stroke();
      });
      
      // Player Proxy crosshair
      ctx.strokeStyle = "#15c2c2";
      ctx.beginPath();
      ctx.arc(window.player.x, window.player.y, 10, 0, Math.PI * 2);
      ctx.moveTo(window.player.x - 15, window.player.y); ctx.lineTo(window.player.x + 15, window.player.y);
      ctx.moveTo(window.player.x, window.player.y - 15); ctx.lineTo(window.player.x, window.player.y + 15);
      ctx.stroke();
    }

    ctx.restore();
  }

  resize();
  rafId = requestAnimationFrame(render);
  
  return () => {
    cancelAnimationFrame(rafId);
    ro.disconnect();
  };
}
