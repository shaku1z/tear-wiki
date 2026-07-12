export function initModelViewer(canvas, modelName, variant) {
  const ctx = canvas.getContext('2d');
  let rafId;
  let time = 0;
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

  const COLORS = {
    charger: "#e23b3b",
    ranged: "#2f6df0",
    flyer: "#8b3bd6",
    bomber: "#ef8a17",
    armored: "#3a4654",
    armoredShield: "#15c2c2",
    warden: "#a81b2a",
    aldric: "#b01030",
    slam: "#ef8a17",
    sludge: "#6f7a35",
    priest: "#a64dd6",
    herald: "#e0902f",
    mender: "#1faf5a",
    anchor: "#1597c2",
    wraith: "#6a6f88",
    chimera: "#444a5c",
    perfect: "#13c4d6",
    eye: "#13c4d6",
    ink: "#0a0a0d",
    grid: "rgba(255,255,255,0.06)",
    dim: "rgba(255,255,255,0.3)"
  };

  const PHYSICS = {
    charger: { speed: 760, time: 0.5 },
    ranged: { speed: 800, cd: 2.3 },
    marksman: { speed: 1900, windup: 1.4 },
    flyer: { speed: 700, cd: 3.3 },
    bomber: { speed: 540, cd: 2.4 },
    warden: { speed: 700, lunge: 1500 },
    colossus: { sweep: 540 },
    source: { cd: 2.5 }
  };

  function drawGrid(w, h, ox, oy, distort) {
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

  function drawDimensions(cx, cy, w, h, labelX, labelY) {
    ctx.strokeStyle = COLORS.dim;
    ctx.fillStyle = COLORS.dim;
    ctx.lineWidth = 1;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    
    const yLine = cy + h/2 + 30;
    ctx.beginPath();
    ctx.moveTo(cx - w/2, yLine - 4); ctx.lineTo(cx - w/2, yLine + 4);
    ctx.moveTo(cx + w/2, yLine - 4); ctx.lineTo(cx + w/2, yLine + 4);
    ctx.moveTo(cx - w/2, yLine); ctx.lineTo(cx + w/2, yLine);
    ctx.stroke();
    ctx.fillText(`${labelX}px`, cx, yLine + 14);
    
    const xLine = cx - w/2 - 30;
    ctx.beginPath();
    ctx.moveTo(xLine - 4, cy - h/2); ctx.lineTo(xLine + 4, cy - h/2);
    ctx.moveTo(xLine - 4, cy + h/2); ctx.lineTo(xLine + 4, cy + h/2);
    ctx.moveTo(xLine, cy - h/2); ctx.lineTo(xLine, cy + h/2);
    ctx.stroke();
    ctx.save();
    ctx.translate(xLine - 12, cy);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(`${labelY}px`, 0, 3);
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

  function render(timestamp) {
    rafId = requestAnimationFrame(render);
    
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1) || 0;
    lastTime = timestamp;
    time += dt;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    
    const width = rect.width, height = rect.height;
    const cx = width / 2, cy = height / 2;
    
    hoverK += ( (isHovered ? 1 : 0) - hoverK ) * 8 * dt; 
    
    gridOffsetX += ( (isHovered ? (cx - mouseX)*0.2 : 0) - gridOffsetX ) * 5 * dt;
    gridOffsetY += ( (isHovered ? (cy - mouseY)*0.2 : 0) - gridOffsetY ) * 5 * dt;

    ctx.clearRect(0, 0, width, height);
    
    const distortGrid = (modelName === "chimera" || modelName === "wraith" || modelName === "the-source");
    drawGrid(width, height, gridOffsetX, gridOffsetY, distortGrid);

    const dx = isHovered ? (mouseX - cx) / cx : 0;
    const dy = isHovered ? (mouseY - cy) / cy : 0;
    const floatY = Math.sin(time * 2.5) * (4 - hoverK * 2);
    const modelY = cy + floatY + dy * 10;
    const modelX = cx + dx * 10;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx + dx*2, cy + Math.abs(floatY) + 50, 20 + floatY, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(modelX, modelY);
    ctx.scale(1.5, 1.5);
    
    const ink = COLORS.ink;
    ctx.shadowColor = "rgba(255,255,255,0.15)";
    ctx.shadowBlur = 8;
    
    const faceDir = isHovered ? Math.sign(mouseX - cx) || 1 : 1;

    if (modelName === "charger") {
      const hw = 18, hh = 18;
      ctx.fillStyle = COLORS.charger;
      
      const tCycle = time % 1.7; // chargeCd + chargeTime = ~1.7s
      const lungeX = hoverK > 0 && tCycle > 1.2 ? faceDir * hoverK * 30 : 0;
      ctx.translate(lungeX, 0);
      
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      if (variant === "bull") {
        ctx.fillStyle = ink;
        ctx.fillRect(-hw + 2, -hh - 6, 5, 6); ctx.fillRect(hw - 7, -hh - 6, 5, 6);
      } else if (variant === "stalker") {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(-hw - 6, -hh + 6); ctx.lineTo(-hw, -hh + 10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hw, -hh); ctx.lineTo(hw + 6, -hh + 6); ctx.lineTo(hw, -hh + 10); ctx.fill();
      }

      ctx.save();
      if (variant === "brawler") {
        ctx.fillStyle = ink;
        const ext = hoverK * 12;
        ctx.fillRect(faceDir * (hw + ext) - 4, - 3, 8, 9);
      } else {
        const wAngle = -0.5 + (lungeX ? 1.5 : hoverK * 1.2); 
        ctx.translate(faceDir * (hw+4), 0);
        ctx.rotate(faceDir * wAngle);
        ctx.fillStyle = ink;
        ctx.fillRect(-2, -18, 4, 24);
        if (variant !== "duelist") {
          ctx.fillStyle = COLORS.charger;
          ctx.fillRect(-4, -20, 8, 12); 
        }
      }
      ctx.restore();
      
      if (variant === "bull" && hoverK > 0) {
        ctx.strokeStyle = COLORS.charger; ctx.globalAlpha = 0.35 + 0.45 * hoverK; ctx.lineWidth = 5; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(faceDir * 100, 0); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        drawAnnotation(0, -hh, faceDir * 40, -hh - 30, `[ARMED CHARGE: ${PHYSICS.charger.speed}px/s]`, COLORS.charger);
      } else if (lungeX) {
        drawAnnotation(0, -hh, -faceDir * 40, -hh - 30, `[LUNGE VEL: ${PHYSICS.charger.speed}px/s]`, COLORS.charger);
      }
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(faceDir * 7 - 3, Math.sin(time*2.5)*2 - 2, 6, 6);
      drawDimensions(0, 0, hw*2, hh*2, 36, 36);

    } else if (modelName === "ranged") {
      const hw = 18, hh = 18, r = hw + 2;
      ctx.fillStyle = COLORS.ranged;
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
      
      if (variant === "sentinel") {
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      } else if (variant === "marksman") {
        ctx.fillStyle = ink; ctx.fillRect(-2, -r - 4, 4, 6);
      }
      
      ctx.fillStyle = ink;
      if (variant !== "sentinel" && variant !== "marksman") {
        ctx.fillRect(-2, -r - 4 + hoverK*4, 4, 6);
      }
      
      if (hoverK > 0) {
        ctx.fillStyle = COLORS.ranged;
        if (variant === "marksman") {
           const tCycle = time % (PHYSICS.marksman.windup + 0.5);
           ctx.globalAlpha = 0.4 + 0.5 * hoverK;
           ctx.beginPath(); ctx.arc(0, 0, 4 + hoverK * 8, 0, Math.PI * 2); ctx.fill();
           ctx.globalAlpha = 1;
           if (tCycle > PHYSICS.marksman.windup) {
              ctx.lineWidth = 4; ctx.strokeStyle = COLORS.eye; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(faceDir*150, 0); ctx.stroke();
           }
           drawAnnotation(0, -r, faceDir * 40, -r - 30, `[VELOCITY: ${PHYSICS.marksman.speed}px/s]`, COLORS.ranged);
        } else if (variant === "sentinel") {
           const tCycle = time % PHYSICS.ranged.cd;
           ctx.lineWidth = 1.2; ctx.strokeStyle = ink; ctx.globalAlpha = 0.5 + 0.4 * hoverK;
           ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(faceDir * 100, hoverK * 30); ctx.stroke();
           ctx.globalAlpha = 1;
           ctx.fillStyle = COLORS.ranged;
           const pDist = Math.min((tCycle * PHYSICS.ranged.speed) * 0.1, 100);
           ctx.beginPath(); ctx.arc(faceDir * (10 + pDist), hoverK * 30, 5, 0, Math.PI * 2); ctx.fill();
           drawAnnotation(0, -r, -faceDir * 40, -r - 30, `[CD: ${PHYSICS.ranged.cd}s]`, COLORS.ranged);
        } else {
           const tCycle = time % PHYSICS.ranged.cd;
           ctx.beginPath();
           const pDist = Math.min((tCycle * PHYSICS.ranged.speed) * 0.1, 100);
           const px = faceDir * (r + 10 + pDist);
           ctx.moveTo(px + faceDir * 6, 0);
           ctx.lineTo(px, -3); ctx.lineTo(px - faceDir * 6, 0); ctx.lineTo(px, 3);
           ctx.fill();
           ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
           drawAnnotation(0, -r, -faceDir * 40, -r - 30, `[SPEED: ${PHYSICS.ranged.speed}px/s]`, COLORS.ranged);
        }
      }
      
      if (variant !== "sentinel") {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(faceDir * 6, Math.sin(time*2.5)*2, 4, 0, Math.PI*2); ctx.fill();
      }
      drawDimensions(0, 0, r*2, r*2, 40, 40);

    } else if (modelName === "flyer") {
      const hw = 20, hh = 18, r = hw + 3;
      ctx.fillStyle = COLORS.flyer;
      ctx.beginPath();
      ctx.moveTo(faceDir * r, 0);
      
      const flap = Math.sin(time * 15);
      const flapY = hoverK > 0 ? flap * 12 : 0;
      const flapX = hoverK > 0 ? Math.abs(flap) * 4 : 0;
      ctx.lineTo(-faceDir * (r - flapX), -hh + flapY);
      ctx.lineTo(-faceDir * r * 0.4, 0);
      ctx.lineTo(-faceDir * (r - flapX), hh - flapY);
      
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
      
      if (variant !== "swooper") {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.moveTo(-4, hh - 2); ctx.lineTo(4, hh - 2); ctx.lineTo(0, hh + 6); ctx.fill();
      }
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(faceDir * 8 - 2, -2, 4, 4);
      
      if (hoverK > 0) {
        if (variant === "divebomber") {
           const tCycle = time % PHYSICS.flyer.cd;
           const yDist = Math.min((tCycle * PHYSICS.flyer.speed) * 0.1, 80);
           ctx.strokeStyle = COLORS.slam; ctx.globalAlpha = 0.5 * hoverK; ctx.lineWidth = 3;
           ctx.beginPath(); ctx.arc(faceDir * 20, 10 + yDist, 6, 0, Math.PI * 2); ctx.stroke();
           ctx.beginPath(); ctx.moveTo(faceDir * 20, hh); ctx.setLineDash([4, 8]); ctx.lineTo(faceDir * 20, 80); ctx.stroke();
           ctx.setLineDash([]); ctx.globalAlpha = 1;
           drawAnnotation(faceDir * 20, hh, -faceDir * 40, hh + 30, `[BOMBARD: ${PHYSICS.flyer.speed}px/s]`, COLORS.slam);
        } else {
           drawAnnotation(faceDir * r, 0, faceDir * 60, -30, `[SWOOP: ${PHYSICS.flyer.speed}px/s]`, COLORS.flyer);
        }
      }
      drawDimensions(0, 0, r*2, hh*2, 46, 36);

    } else if (modelName === "bomber") {
      const hw = 22, hh = 22;
      ctx.fillStyle = COLORS.bomber;
      const pulse = Math.sin(time*5) * 2 * (1 + hoverK);
      ctx.beginPath(); ctx.arc(0, 0, hw + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
      
      if (variant === "trapper") { ctx.fillStyle = "#fff"; ctx.fillRect(-6, -1, 12, 3); }
      else if (variant === "juggler") { ctx.fillStyle = "#fff"; for(let i=0;i<3;i++) ctx.fillRect(-6 + i*5, -3, 3, 3); }
      else if (variant === "sludge") { ctx.fillStyle = COLORS.sludge; ctx.beginPath(); ctx.arc(0, 0, hw * 0.5, 0, Math.PI*2); ctx.fill(); }
      else if (variant === "geomancer") { ctx.fillStyle = "#fff"; ctx.fillRect(-5, -4, 10, 8); }
      else { ctx.fillStyle = "#fff"; ctx.fillRect(-6, -1, 12, 3); }
      
      ctx.fillStyle = ink; ctx.fillRect(-2, -hh - 8, 4, 8);
      
      if (hoverK > 0) {
        const tCycle = (time % PHYSICS.bomber.cd) / PHYSICS.bomber.cd;
        const px = faceDir * tCycle * 60, py = -hh - 10 - tCycle * 40 + tCycle*tCycle * 60;
        
        if (variant === "trapper") {
          ctx.fillStyle = COLORS.bomber;
          ctx.beginPath(); ctx.arc(faceDir * 35, 45, 8, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = Math.floor(time * 3) % 2 === 0 ? COLORS.charger : ink;
          ctx.beginPath(); ctx.arc(faceDir * 35, 44, 2.5, 0, Math.PI*2); ctx.fill();
          drawAnnotation(faceDir * 35, 40, faceDir * 70, 20, "[PROXIMITY MINE]", COLORS.bomber);
        } else if (variant === "sludge") {
          const wob = Math.sin(time*12) * 1.4;
          ctx.fillStyle = COLORS.sludge; ctx.beginPath(); ctx.ellipse(px, py, 6 + wob, 6 - wob, 0, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
          drawAnnotation(0, -hh, -faceDir * 40, -hh - 30, `[SLUDGE CD: ${PHYSICS.bomber.cd}s]`, COLORS.sludge);
        } else if (variant === "geomancer") {
          ctx.fillStyle = COLORS.sludge; ctx.globalAlpha = hoverK * 0.7;
          ctx.fillRect(faceDir * 40 - 15, 45 - hoverK * 30, 30, hoverK * 30);
          ctx.globalAlpha = 1;
          drawAnnotation(faceDir * 40, 15, faceDir * 80, -10, "[TERRAIN ERECTION]", COLORS.sludge);
        } else {
          ctx.fillStyle = COLORS.bomber;
          ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = Math.floor(time * 8) % 2 === 0 ? "#fff" : COLORS.bomber;
          ctx.fillRect(px - 1, py - 9, 2, 3);
          drawAnnotation(0, -hh, -faceDir * 40, -hh - 30, `[LOB VEL: ${PHYSICS.bomber.speed}px/s]`, COLORS.bomber);
        }
      }
      drawDimensions(0, 0, hw*2, hw*2, 44, 44);

    } else if (modelName === "armored") {
      const hw = 24, hh = 26;
      ctx.fillStyle = COLORS.armored;
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      const gx = faceDir * (hw + 9);
      ctx.fillStyle = COLORS.armoredShield;
      ctx.fillRect(gx - 4, -hh - 6, 8, hh*2 + 12);
      ctx.fillRect(gx - faceDir * 6 - 1, -hh - 6, faceDir * 7, 5);
      ctx.fillRect(gx - faceDir * 6 - 1, hh + 1, faceDir * 7, 5);
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(faceDir * 10 - 3, -6, 6, 6);
      
      if (hoverK > 0) {
         ctx.fillStyle = COLORS.armoredShield; ctx.globalAlpha = 0.4 * Math.abs(Math.sin(time*3));
         ctx.fillRect(gx - 10, -hh - 16, 20, hh*2 + 32);
         ctx.globalAlpha = 1;
         
         const tCycle = (time % 3) / 3;
         const r = tCycle * 80;
         ctx.strokeStyle = COLORS.slam; ctx.globalAlpha = hoverK * (1 - tCycle); ctx.lineWidth = 4;
         ctx.beginPath(); ctx.ellipse(0, hh + 2, r, r * 0.3, 0, 0, Math.PI*2); ctx.stroke();
         ctx.globalAlpha = 1;
         
         drawAnnotation(gx, 0, faceDir * 70, -30, "[DEFLECTION BARRIER]", COLORS.armoredShield);
         drawAnnotation(0, hh, -faceDir * 50, hh + 20, "[IMPACT STOMP]", COLORS.slam);
      }
      drawDimensions(0, 0, hw*2 + 18, hh*2, 66, 52);

    } else if (modelName === "support") {
      const hw = 16, hh = 21; 
      const t = variant || "priest";
      ctx.fillStyle = COLORS[t] || COLORS.priest;
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.shadowBlur = 0;
      
      const body = ctx.fillStyle;
      if (t === "priest") {
        ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(hw, 0); ctx.lineTo(hw * 0.7, hh);
        ctx.lineTo(-hw * 0.7, hh); ctx.lineTo(-hw, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        
        const haloY = -hh - 4 - hoverK * 8;
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, haloY, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(-2, haloY - 7, 4, 14); ctx.fillRect(-6, haloY - 3, 12, 4);
        
        if (hoverK > 0) {
           const pulse = (time % 2) / 2;
           ctx.strokeStyle = COLORS.priest; ctx.globalAlpha = 0.6 * (1 - pulse); ctx.lineWidth = 3;
           ctx.beginPath(); ctx.arc(0, 0, pulse * 80, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
           drawAnnotation(0, -hh, faceDir * 50, -hh - 30, "[INVULNERABILITY AURA]", COLORS.priest);
        }
      } else if (t === "herald") {
        ctx.fillRect(-hw * 0.55, -hh * 0.6, hw * 1.1, hh * 1.6); ctx.strokeRect(-hw * 0.55, -hh * 0.6, hw * 1.1, hh * 1.6);
        ctx.fillStyle = ink; ctx.fillRect(hw * 0.55, -hh, 3, hh * 2); // pole
        const wave = Math.sin(time * 15) * 6 * hoverK + Math.sin(time * 8) * 2;
        ctx.fillStyle = body; ctx.fillRect(hw * 0.55 + 3, -hh + wave, 16, 12); ctx.strokeRect(hw * 0.55 + 3, -hh + wave, 16, 12); // flag
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(hw * 0.55 + 6, -hh + 3 + wave); ctx.lineTo(hw * 0.55 + 12, -hh + 6 + wave); ctx.lineTo(hw * 0.55 + 6, -hh + 9 + wave); ctx.fill();
        if (hoverK > 0) {
           const pulse = (time % 2) / 2;
           ctx.strokeStyle = COLORS.herald; ctx.globalAlpha = 0.6 * (1 - pulse); ctx.lineWidth = 3;
           ctx.beginPath(); ctx.arc(0, 0, pulse * 80, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
           drawAnnotation(hw * 0.55 + 10, -hh, faceDir * 60, -hh - 20, "[HASTE BANNER]", COLORS.herald);
        }
      } else if (t === "mender") {
        ctx.beginPath(); ctx.arc(0, 0, hw * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(-2.5, -10, 5, 20); ctx.fillRect(-9, -2.5, 18, 5);
        if (hoverK > 0) {
          ctx.strokeStyle = COLORS.mender; ctx.globalAlpha = 0.6 + 0.3*Math.sin(time*15); ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(faceDir*80, -40); ctx.stroke(); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(faceDir*80, -40, 6, 0, Math.PI*2); ctx.fill();
          drawAnnotation(faceDir*40, -20, faceDir*70, 10, "[RESTORATION BEAM]", COLORS.mender);
        }
      } else if (t === "anchor") {
        ctx.fillRect(-hw, -hh * 0.7, hw * 2, hh * 1.7); ctx.strokeRect(-hw, -hh * 0.7, hw * 2, hh * 1.7);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -6, 3, 0, Math.PI * 2); ctx.stroke(); // ring
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 8); ctx.stroke(); // shaft
        ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(0, 12, 7, 4); ctx.stroke(); // flukes
        if (hoverK > 0) {
          ctx.strokeStyle = COLORS.anchor; ctx.globalAlpha = 0.5 + 0.3*Math.sin(time*10); ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(faceDir*70, 0); ctx.stroke(); ctx.globalAlpha = 0.2;
          ctx.fillStyle = COLORS.anchor; ctx.beginPath(); ctx.arc(faceDir*70, 0, 20, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.stroke();
          drawAnnotation(faceDir*35, 0, faceDir*60, -30, "[SOUL TETHER]", COLORS.anchor);
        }
      }
      drawDimensions(0, 0, hw*2, hh*2, 32, 42);

    } else if (modelName === "chimera") {
      const hw = 19, hh = 24;
      ctx.shadowBlur = 0;
      
      let cueCol = COLORS.chimera;
      if (hoverK > 0) {
        const cycle = Math.floor(time * 1.5) % 4;
        cueCol = cycle === 0 ? COLORS.charger : cycle === 1 ? COLORS.ranged : cycle === 2 ? COLORS.bomber : COLORS.slam;
        ctx.strokeStyle = cueCol; ctx.globalAlpha = 0.8; ctx.setLineDash([5, 4]); ctx.lineWidth = 2.5;
        ctx.strokeRect(-hw - 4, -hh - 4, hw * 2 + 8, hh * 2 + 8); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      
      ctx.save();
      if (hoverK > 0) {
        ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4); 
      }
      
      ctx.beginPath();
      ctx.moveTo(-hw, -hh * 0.2); ctx.lineTo(-hw * 0.5, -hh); ctx.lineTo(hw * 0.7, -hh * 0.8);
      ctx.lineTo(hw, hh * 0.1); ctx.lineTo(hw * 0.5, hh); ctx.lineTo(-hw * 0.7, hh); ctx.closePath();
      
      ctx.fillStyle = hoverK > 0 ? cueCol : COLORS.chimera;
      ctx.fill();
      
      ctx.save(); ctx.clip();
      ctx.globalAlpha = 0.35; ctx.fillStyle = ink;
      ctx.fillRect(-hw, -hh, hw, hh * 2);
      ctx.restore(); ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
      
      ctx.fillStyle = ink;
      for (let i = -1; i <= 2; i++) {
        const sx = i * (hw * 0.5) - 3, sh = 6 + ((i + 1) % 3) * 4;
        ctx.beginPath(); ctx.moveTo(sx, -hh * 0.7); ctx.lineTo(sx + 4, -hh * 0.7 - sh); ctx.lineTo(sx + 8, -hh * 0.7); ctx.fill();
      }
      
      ctx.fillStyle = COLORS.eye;
      ctx.fillRect(-8, -2, 4, 5); ctx.fillRect(-1, -5, 4, 5); ctx.fillRect(5, -1, 4, 5);
      ctx.restore();
      
      if (hoverK > 0) {
        drawAnnotation(hw, 0, faceDir * 60, -30, "[ADAPTIVE MIMICRY]", cueCol);
      }
      drawDimensions(0, 0, hw*2, hh*2, 38, 48);

    } else if (modelName === "wraith") {
      const hw = 18, hh = 21;
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.wraith;
      
      ctx.globalAlpha = 1 - 0.7 * hoverK; 
      
      if (hoverK > 0) {
        ctx.save(); ctx.translate(-2, 0); ctx.fillStyle = "rgba(255,0,0,0.5)";
        ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(hw, 0); ctx.lineTo(hw * 0.5, hh); ctx.lineTo(0, hh * 0.55); ctx.lineTo(-hw * 0.5, hh); ctx.lineTo(-hw, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(2, 0); ctx.fillStyle = "rgba(0,255,255,0.5)";
        ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(hw, 0); ctx.lineTo(hw * 0.5, hh); ctx.lineTo(0, hh * 0.55); ctx.lineTo(-hw * 0.5, hh); ctx.lineTo(-hw, 0); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      
      ctx.beginPath();
      ctx.moveTo(0, -hh); ctx.lineTo(hw, 0); ctx.lineTo(hw * 0.5, hh);
      ctx.lineTo(0, hh * 0.55); ctx.lineTo(-hw * 0.5, hh); ctx.lineTo(-hw, 0);
      ctx.closePath(); ctx.fill();
      
      ctx.globalAlpha = 1; 
      ctx.strokeStyle = hoverK > 0 ? COLORS.eye : ink; 
      ctx.lineWidth = 2; ctx.stroke();
      
      ctx.fillStyle = COLORS.eye; ctx.fillRect(-7, -4, 4, 6); ctx.fillRect(3, -4, 4, 6);
      
      if (hoverK > 0) {
        drawAnnotation(hw, 0, faceDir * 50, -20, "[ETHEREAL SHIFT]", COLORS.eye);
      }
      drawDimensions(0, 0, hw*2, hh*2, 36, 42);

    } else if (modelName === "warden") {
      const hw = 30, hh = 30;
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.warden;
      
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(-hw + 8, hh - 12, 6, 6);
      
      ctx.fillRect(12, -10, 10, 8);
      
      const swing = hoverK > 0 ? Math.sin(time*5)*0.5 : 0;
      ctx.save();
      ctx.translate(hw - 4, -hh + 6);
      ctx.rotate(-0.3 + swing);
      ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(35, 0); ctx.stroke();
      ctx.restore();
      
      if (hoverK > 0) {
        const tCycle = (time % 1.5) / 1.5;
        const slamR = tCycle * PHYSICS.warden.speed * 0.2;
        ctx.strokeStyle = COLORS.slam; ctx.globalAlpha = hoverK * (1 - tCycle); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, hh + 20, slamR, slamR * 0.3, 0, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = 1;
        drawAnnotation(-hw, -hh, -60, -hh - 30, "[SECTOR LOCKDOWN]", COLORS.warden);
        drawAnnotation(0, hh, faceDir * 80, hh + 20, `[VEL: ${PHYSICS.warden.speed}px/s]`, COLORS.slam);
      }
      
      drawDimensions(0, 0, hw*2, hh*2, 60, 60);

    } else if (modelName === "iron-colossus") {
      const hw = 36, hh = 40;
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.armored;
      
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      ctx.fillStyle = ink;
      for (let i = 0; i < 4; i++) { 
        ctx.fillRect(-hw + 8 + i * ((hw*2 - 24) / 3), -hh + 8, 5, 5); 
        ctx.fillRect(-hw + 8 + i * ((hw*2 - 24) / 3), hh - 13, 5, 5); 
      }
      
      ctx.fillStyle = "#fff"; ctx.fillRect(16 - 8, -28 + hh, 24, 16);
      
      ctx.fillStyle = COLORS.armoredShield;
      ctx.fillRect(hw, -hh - 8, 12, hh*2 + 16);
      ctx.fillRect(hw - 11, -hh - 8, 11, 8);
      ctx.fillRect(hw - 11, hh, 11, 8);
      
      if (hoverK > 0) {
        ctx.fillStyle = COLORS.armoredShield; ctx.globalAlpha = hoverK * 0.4 * Math.abs(Math.sin(time*2));
        ctx.fillRect(hw + 16, -hh - 8, 40, hh*2 + 16);
        ctx.globalAlpha = 1;
        drawAnnotation(hw + 6, 0, hw + 70, -30, "[CONTAINMENT BARRIER]", COLORS.armoredShield);
      }
      
      drawDimensions(0, 0, hw*2, hh*2, 72, 80);

    } else if (modelName === "the-echo") {
      const hw = 12, hh = 18;
      ctx.shadowBlur = 0;
      
      if (hoverK > 0) {
        const splitX = hoverK * 30 * -faceDir;
        ctx.globalAlpha = hoverK * 0.5;
        ctx.fillStyle = ink; ctx.fillRect(-hw + splitX, -hh, hw*2, hh*2);
        ctx.fillStyle = COLORS.eye;
        ctx.beginPath(); ctx.moveTo(splitX + faceDir * 6, -5); ctx.lineTo(splitX + faceDir * 12, 0); ctx.lineTo(splitX + faceDir * 6, 5); ctx.fill();
        ctx.globalAlpha = 1;
        drawAnnotation(splitX, -hh, -faceDir * 50, -hh - 40, "[ANOMALY REPLICATION]", COLORS.eye);
      }
      
      ctx.fillStyle = ink;
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      
      ctx.fillStyle = COLORS.eye;
      ctx.beginPath(); ctx.moveTo(faceDir * 6, -5); ctx.lineTo(faceDir * 12, 0); ctx.lineTo(faceDir * 6, 5); ctx.fill();
      
      drawDimensions(0, 0, hw*2, hh*2, 24, 36);

    } else if (modelName === "the-source") {
      const w = 40, h = 40;
      const core = COLORS.perfect;
      ctx.shadowBlur = 0;
      
      const cycleTime = PHYSICS.source.cd;
      const tCycle = (time % cycleTime) / cycleTime;
      const cyclePhase = Math.floor(time / cycleTime) % 3;
      
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.1 * Math.sin(time*1.5); ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(0, 0, w * 1.45, h * 1.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      
      const ticks = Math.floor(time);
      const spin = ticks * (Math.PI / 5);
      
      ctx.rotate(spin);
      ctx.fillStyle = "#191328";
      ctx.beginPath();
      const pts = 10;
      for (let i = 0; i < pts; i++) { 
        const a = i / pts * Math.PI * 2, r = (i % 2 ? w : w * 0.6) * (1 + 0.07 * Math.sin(time * 6 + i)); 
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); 
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = core; ctx.lineWidth = 3; ctx.stroke();
      ctx.rotate(-spin);
      
      const cr = w * 0.34 * (0.8 + 0.2 * Math.sin(time * 4));
      ctx.globalAlpha = 0.9; ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, cr * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      
      if (hoverK > 0) {
        if (cyclePhase === 0) { // Warden shockwave
           const r = tCycle * PHYSICS.warden.speed * 0.2; 
           ctx.strokeStyle = COLORS.slam; ctx.globalAlpha = hoverK * (1 - tCycle); ctx.lineWidth = 4;
           ctx.beginPath(); ctx.ellipse(0, 30, r, r * 0.3, 0, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
           drawAnnotation(w, 0, 80, -50, `[MIMICRY: SEISMIC ${PHYSICS.warden.speed}px/s]`, COLORS.slam);
        } else if (cyclePhase === 1) { // Colossus sweeper
           const cx = (tCycle - 0.5) * PHYSICS.colossus.sweep * 0.4;
           ctx.fillStyle = COLORS.armoredShield; ctx.globalAlpha = hoverK;
           ctx.fillRect(cx - 5, -50, 10, 100); ctx.globalAlpha = 1;
           drawAnnotation(w, 0, 80, -50, `[MIMICRY: SWEEPER ${PHYSICS.colossus.sweep}px/s]`, COLORS.armoredShield);
        } else if (cyclePhase === 2) { // Echo split
           ctx.globalAlpha = hoverK * 0.5; ctx.fillStyle = COLORS.eye;
           const sx = tCycle * 80;
           ctx.beginPath(); ctx.arc(-sx, 0, 10, 0, Math.PI*2); ctx.fill();
           ctx.beginPath(); ctx.arc(sx, 0, 10, 0, Math.PI*2); ctx.fill();
           ctx.globalAlpha = 1;
           drawAnnotation(w, 0, 80, -50, `[MIMICRY: ANOMALY CLONE]`, COLORS.eye);
        }
      }
      
      drawDimensions(0, 0, w*2.9, h*2.9, 116, 116);

    } else if (modelName === "aldric") {
      const hw = 32, hh = 38;
      ctx.fillStyle = COLORS.aldric;
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      ctx.fillStyle = "#fff"; ctx.fillRect(faceDir * 16 - 8, 14, 16, 11);
      
      const swing = hoverK > 0 ? Math.sin(time*8)*0.8 : 0;
      const wAngle = -0.3 + swing; 
      const hx = faceDir * hw * 0.5, hy = -4, L = 64;
      const tx = hx + faceDir * Math.cos(wAngle) * L, ty = hy + Math.sin(wAngle) * L;
      
      if (hoverK > 0) {
         ctx.strokeStyle = COLORS.slam; ctx.globalAlpha = 0.4 * hoverK; ctx.lineWidth = 14; ctx.lineCap = "round";
         ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.globalAlpha = 1;
         drawAnnotation(tx, ty, faceDir * 100, -50, "[BERSERKER RAGE]", COLORS.slam);
      }
      
      ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.atan2(ty - hy, tx - hx)); ctx.fillStyle = ink;
      ctx.fillRect(-6, -14, 26, 28); ctx.restore();
      
      drawDimensions(0, 0, hw*2, hh*2, 64, 76);
    }
    
    ctx.restore();
  }

  rafId = requestAnimationFrame(render);
  
  return () => {
    cancelAnimationFrame(rafId);
    ro.disconnect();
  };
}
