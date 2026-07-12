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

export function initModelViewer(canvas, modelName, variant) {
  const ctx = canvas.getContext('2d');
  let rafId;
  let lastTime = performance.now();
  
  let hoverK = 0; 
  let isHovered = false;
  let mouseX = 0, mouseY = 0;
  let gridOffsetX = 0, gridOffsetY = 0;
  
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
  canvas.addEventListener('mouseleave', () => { isHovered = false; });

  const MAP = {
    charger: Charger, ranged: Ranged, flyer: Flyer, bomber: Bomber,
    armored: Armored, support: Support, wraith: Wraith, chimera: Chimera,
    warden: Warden, "iron-colossus": Colossus, aldric: Aldric, "the-echo": Echo, "the-source": Source
  };
  
  const Cls = MAP[modelName] || Enemy;
  let enemyInstance;
  if (modelName === "the-source" || modelName === "iron-colossus" || modelName === "aldric" || modelName === "the-echo" || modelName === "warden") {
    enemyInstance = new Cls(0, 0, CONFIG[modelName.replace("iron-","").replace("the-","")] || CONFIG.boss);
  } else {
    enemyInstance = new Cls(0, 0, CONFIG[modelName] || CONFIG.charger);
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
    grid: "rgba(255,255,255,0.06)",
    dim: "rgba(255,255,255,0.3)"
  };

  function drawGrid(w, h, ox, oy, distort, time) {
    ctx.save();
    ctx.translate(w/2 + ox, h/2 + oy);
    const scale = 1 + hoverK * 0.15;
    ctx.scale(scale, scale);
    ctx.translate(-w/2, -h/2);
    
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = -w; x <= w*2; x += 20) { 
      ctx.moveTo(x, -h); 
      if (distort && hoverK > 0 && Math.abs(x - w/2) < 150) {
         ctx.bezierCurveTo(x + hoverK*40 * Math.sin(time*2), h/2, x - hoverK*40 * Math.cos(time*1.5), h/2, x, h*2);
      } else {
         ctx.lineTo(x, h*2); 
      }
    }
    for (let y = -h; y <= h*2; y += 20) { 
      ctx.moveTo(-w, y); 
      if (distort && hoverK > 0 && Math.abs(y - h/2) < 150) {
         ctx.bezierCurveTo(w/2, y + hoverK*40 * Math.cos(time*2), w/2, y - hoverK*40 * Math.sin(time*1.5), w*2, y);
      } else {
         ctx.lineTo(w*2, y); 
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawAnnotation(x, y, tx, ty, text, color) {
    if (hoverK < 0.1) return;
    const alpha = hoverK;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); 
    
    const dx = tx - x, dy = ty - y;
    const lx = x + dx * hoverK;
    const ly = y + dy * hoverK;
    ctx.lineTo(lx, ly);
    ctx.lineTo(lx + (tx > x ? 20 : -20) * hoverK, ly);
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = tx > x ? "left" : "right";
    const chars = Math.floor(text.length * hoverK);
    ctx.fillText(text.substring(0, chars), lx + (tx > x ? 25 : -25), ly + 4);
    ctx.restore();
  }

  let engineTime = 0;

  function render(timestamp) {
    rafId = requestAnimationFrame(render);
    
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1) || 0;
    lastTime = timestamp;
    engineTime += dt;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    
    const width = rect.width, height = rect.height;
    const cx = width / 2, cy = height / 2;
    
    hoverK += ( (isHovered ? 1 : 0) - hoverK ) * 8 * dt; 
    gridOffsetX += ( (isHovered ? (cx - mouseX)*0.2 : 0) - gridOffsetX ) * 5 * dt;
    gridOffsetY += ( (isHovered ? (cy - mouseY)*0.2 : 0) - gridOffsetY ) * 5 * dt;

    ctx.clearRect(0, 0, width, height);
    
    const distortGrid = (modelName === "chimera" || modelName === "wraith" || modelName === "the-source");
    drawGrid(width, height, gridOffsetX, gridOffsetY, distortGrid, engineTime);

    const dx = isHovered ? (mouseX - cx) : 0;
    const dy = isHovered ? (mouseY - cy) : 0;
    
    // Update player mock to track mouse loosely, so bosses attack it
    window.player.x = dx * 1.5;
    window.player.y = dy * 1.5 - 50;
    
    // Fake the ground
    enemyInstance.onGround = !enemyInstance.cfg.hoverY;

    // Boss Phase Showcase Logic: Animate HP to force phase transitions over a 12 second loop
    const cycleTime = 12;
    const loopTime = engineTime % cycleTime;
    
    // Reset state when loop restarts
    if (loopTime < dt) {
      window.projectiles = [];
      FX.list = [];
      if (enemyInstance.zones) enemyInstance.zones = [];
    }

    if (modelName === "the-source" || modelName === "iron-colossus" || modelName === "aldric" || modelName === "the-echo" || modelName === "warden") {
       // Drain HP from 100% down to 1% over the cycle to trigger all phases natively
       enemyInstance.hp = Math.max(1, enemyInstance.maxHp * (1 - loopTime / cycleTime));
    }

    // Simulate engine
    enemyInstance.update(dt, window.platforms, window.player, window.projectiles);
    // Bind position to origin for viewer
    enemyInstance.x = 0;
    enemyInstance.y = 0;

    // Simulate Projectiles
    window.projectiles = window.projectiles.filter(p => p.life > 0);
    window.projectiles.forEach(p => {
      // Very basic projectile update since we don't have projectile.update method in projectile.js
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vy !== 0 || p.gravity) p.vy += (p.gravity || 0) * dt;
      p.life -= dt;
    });

    // Simulate Particles
    FX.list = FX.list.filter(p => p.life > 0);
    FX.list.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
    });

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.5, 1.5);
    
    // Draw all
    // Draw Projectiles
    window.projectiles.forEach(p => {
      ctx.fillStyle = p.tint || "#e23b3b";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 6, 0, Math.PI*2);
      ctx.fill();
    });

    // Draw Particles
    FX.list.forEach(p => {
      ctx.fillStyle = p.col;
      ctx.globalAlpha = p.life / p.max;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    enemyInstance.draw(ctx);
    
    // Schematic annotations layer
    if (hoverK > 0) {
      ctx.globalAlpha = hoverK;
      const state = enemyInstance.state || enemyInstance.atk || enemyInstance.mode || "idle";
      let cueColor = "#15c2c2";
      if (enemyInstance.color && enemyInstance.color !== "#000") cueColor = enemyInstance.color;
      
      drawAnnotation(enemyInstance.hw, -enemyInstance.hh, 50, -50, `[STATE: ${state.toUpperCase()}]`, cueColor);
      drawAnnotation(-enemyInstance.hw, -enemyInstance.hh, -50, -50, `[HP: ${enemyInstance.hp}]`, "#fff");
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  rafId = requestAnimationFrame(render);
  
  return () => {
    cancelAnimationFrame(rafId);
    ro.disconnect();
  };
}
