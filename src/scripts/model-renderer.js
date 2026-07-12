export function initModelViewer(canvas, modelName, variant) {
  const ctx = canvas.getContext('2d');
  let rafId;
  let time = 0;
  
  let hoverK = 0; 
  let isHovered = false;
  let mouseX = 0, mouseY = 0;
  
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
    grid: "rgba(255,255,255,0.04)",
    dim: "rgba(255,255,255,0.25)"
  };

  function drawGrid(w, h) {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = w/2 % 20; x <= w; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = h/2 % 20; y <= h; y += 20) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
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

  function render() {
    rafId = requestAnimationFrame(render);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width, height = rect.height;
    const cx = width / 2, cy = height / 2;
    
    time += 0.05;
    hoverK += ( (isHovered ? 1 : 0) - hoverK ) * 0.1; 

    ctx.clearRect(0, 0, width, height);
    drawGrid(width, height);

    const dx = isHovered ? (mouseX - cx) / cx : 0;
    const dy = isHovered ? (mouseY - cy) / cy : 0;
    const floatY = Math.sin(time * 0.5) * (4 - hoverK * 2);
    const modelY = cy + floatY + dy * 10;
    const modelX = cx + dx * 10;

    ctx.fillStyle = "rgba(0,0,0,0.4)";
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
        const wAngle = -0.5 + hoverK * 1.2; 
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
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(faceDir * (40 + hoverK * 100), 0); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(faceDir * 7 - 3, Math.sin(time)*2 - 2, 6, 6);
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
           ctx.globalAlpha = 0.4 + 0.5 * hoverK;
           ctx.beginPath(); ctx.arc(0, 0, 4 + hoverK * 8, 0, Math.PI * 2); ctx.fill();
           ctx.globalAlpha = 1;
        } else if (variant === "sentinel") {
           ctx.lineWidth = 1.2; ctx.strokeStyle = ink; ctx.globalAlpha = 0.5 + 0.4 * hoverK;
           ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(faceDir * 100, hoverK * 30); ctx.stroke();
           ctx.globalAlpha = 1;
           ctx.fillStyle = COLORS.ranged;
           ctx.beginPath(); ctx.arc(faceDir * (30 + hoverK * 20), hoverK * 30, 5, 0, Math.PI * 2); ctx.fill();
        } else {
           ctx.beginPath();
           const px = faceDir * (r + 10 + hoverK * 20);
           ctx.moveTo(px + faceDir * 6, 0);
           ctx.lineTo(px, -3); ctx.lineTo(px - faceDir * 6, 0); ctx.lineTo(px, 3);
           ctx.fill();
           ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }
      
      if (variant !== "sentinel") {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(faceDir * 6, Math.sin(time)*2, 4, 0, Math.PI*2); ctx.fill();
      }
      drawDimensions(0, 0, r*2, r*2, 40, 40);

    } else if (modelName === "flyer") {
      const hw = 20, hh = 18, r = hw + 3;
      ctx.fillStyle = COLORS.flyer;
      ctx.beginPath();
      ctx.moveTo(faceDir * r, 0);
      
      const flapY = hoverK * 8;
      const flapX = hoverK * 4;
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
      
      if (variant === "divebomber" && hoverK > 0) {
         ctx.strokeStyle = COLORS.slam; ctx.globalAlpha = (0.35 + 0.5 * hoverK) * hoverK; ctx.lineWidth = 3;
         ctx.beginPath(); ctx.arc(faceDir * 20, 50, 34 - 22 * hoverK, 0, Math.PI * 2); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(faceDir * 20, hh); ctx.setLineDash([4, 8]); ctx.lineTo(faceDir * 20, 50); ctx.stroke();
         ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      drawDimensions(0, 0, r*2, hh*2, 46, 36);

    } else if (modelName === "bomber") {
      const hw = 22, hh = 22;
      ctx.fillStyle = COLORS.bomber;
      const pulse = Math.sin(time*2) * 2 * (1 + hoverK);
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
        const px = faceDir * hoverK * 30, py = -hh - 10 - hoverK * 20 + hoverK*hoverK * 30;
        if (variant === "trapper") {
          ctx.fillStyle = COLORS.bomber;
          ctx.beginPath(); ctx.arc(faceDir * 35, 45, 8, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = Math.floor(time * 10) % 2 === 0 ? COLORS.charger : ink;
          ctx.beginPath(); ctx.arc(faceDir * 35, 44, 2.5, 0, Math.PI*2); ctx.fill();
        } else if (variant === "sludge") {
          const wob = Math.sin(time*4) * 1.4;
          ctx.fillStyle = COLORS.sludge; ctx.beginPath(); ctx.ellipse(px, py, 6 + wob, 6 - wob, 0, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
        } else if (variant === "geomancer") {
          ctx.fillStyle = COLORS.sludge; ctx.globalAlpha = hoverK * 0.7;
          ctx.fillRect(faceDir * 40 - 15, 45 - hoverK * 30, 30, hoverK * 30);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = COLORS.bomber;
          ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = Math.floor(time * 15) % 2 === 0 ? "#fff" : COLORS.bomber;
          ctx.fillRect(px - 1, py - 9, 2, 3);
        }
      }
      drawDimensions(0, 0, hw*2, hw*2, 44, 44);

    } else if (modelName === "armored") {
      const hw = 24, hh = 26;
      ctx.fillStyle = COLORS.armored;
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      const gx = faceDir * (hw + 9 - hoverK*4);
      ctx.fillStyle = COLORS.armoredShield;
      ctx.fillRect(gx - 4, -hh - 6, 8, hh*2 + 12);
      ctx.fillRect(gx - faceDir * 6 - 1, -hh - 6, faceDir * 7, 5);
      ctx.fillRect(gx - faceDir * 6 - 1, hh + 1, faceDir * 7, 5);
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(faceDir * 10 - 3, -6, 6, 6);
      
      if (hoverK > 0) {
         ctx.strokeStyle = COLORS.slam; ctx.globalAlpha = (0.35 + 0.5 * hoverK) * hoverK; ctx.lineWidth = 3 + hoverK * 3;
         ctx.beginPath(); ctx.moveTo(-(40 + 60 * hoverK), hh + 2); ctx.lineTo((40 + 60 * hoverK), hh + 2); ctx.stroke();
         ctx.globalAlpha = 1;
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
           ctx.strokeStyle = COLORS.priest; ctx.globalAlpha = 0.4 + 0.2*Math.sin(time*5);
           ctx.beginPath(); ctx.arc(0, 0, 80 * hoverK, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
        }
      } else if (t === "herald") {
        ctx.fillRect(-hw * 0.55, -hh * 0.6, hw * 1.1, hh * 1.6); ctx.strokeRect(-hw * 0.55, -hh * 0.6, hw * 1.1, hh * 1.6);
        ctx.fillStyle = ink; ctx.fillRect(hw * 0.55, -hh, 3, hh * 2); // pole
        const wave = Math.sin(time * 3 + hoverK) * 5;
        ctx.fillStyle = body; ctx.fillRect(hw * 0.55 + 3, -hh + wave, 16, 12); ctx.strokeRect(hw * 0.55 + 3, -hh + wave, 16, 12); // flag
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(hw * 0.55 + 6, -hh + 3 + wave); ctx.lineTo(hw * 0.55 + 12, -hh + 6 + wave); ctx.lineTo(hw * 0.55 + 6, -hh + 9 + wave); ctx.fill();
        if (hoverK > 0) {
           ctx.strokeStyle = COLORS.herald; ctx.globalAlpha = 0.4 + 0.2*Math.sin(time*5);
           ctx.beginPath(); ctx.arc(0, 0, 80 * hoverK, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
        }
      } else if (t === "mender") {
        ctx.beginPath(); ctx.arc(0, 0, hw * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(-2.5, -10, 5, 20); ctx.fillRect(-9, -2.5, 18, 5);
        if (hoverK > 0) {
          ctx.strokeStyle = COLORS.mender; ctx.globalAlpha = 0.6; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(faceDir*50, -40); ctx.stroke(); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(faceDir*50, -46, 3, 0, Math.PI*2); ctx.fill();
        }
      } else if (t === "anchor") {
        ctx.fillRect(-hw, -hh * 0.7, hw * 2, hh * 1.7); ctx.strokeRect(-hw, -hh * 0.7, hw * 2, hh * 1.7);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -6, 3, 0, Math.PI * 2); ctx.stroke(); // ring
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 8); ctx.stroke(); // shaft
        ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(0, 12, 7, 4); ctx.stroke(); // flukes
        if (hoverK > 0) {
          ctx.strokeStyle = COLORS.anchor; ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(faceDir*60, 0); ctx.stroke(); ctx.globalAlpha = 0.1;
          ctx.fillStyle = COLORS.anchor; ctx.beginPath(); ctx.arc(faceDir*70, 0, 20, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.stroke();
        }
      }
      drawDimensions(0, 0, hw*2, hh*2, 32, 42);

    } else if (modelName === "chimera") {
      const hw = 19, hh = 24;
      ctx.shadowBlur = 0;
      const cueCol = hoverK > 0 ? (Math.floor(time * 2) % 3 === 0 ? COLORS.charger : Math.floor(time * 2) % 3 === 1 ? COLORS.ranged : COLORS.bomber) : COLORS.chimera;
      
      if (hoverK > 0) {
        ctx.strokeStyle = cueCol; ctx.globalAlpha = 0.6; ctx.setLineDash([5, 4]); ctx.lineWidth = 2.5;
        ctx.strokeRect(-hw - 4, -hh - 4, hw * 2 + 8, hh * 2 + 8); ctx.setLineDash([]); ctx.globalAlpha = 1;
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
      drawDimensions(0, 0, hw*2, hh*2, 38, 48);

    } else if (modelName === "wraith") {
      const hw = 18, hh = 21;
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.wraith;
      
      ctx.globalAlpha = 0.8 - 0.4 * hoverK; // becomes ethereal
      ctx.beginPath();
      ctx.moveTo(0, -hh); ctx.lineTo(hw, 0); ctx.lineTo(hw * 0.5, hh);
      ctx.lineTo(0, hh * 0.55); ctx.lineTo(-hw * 0.5, hh); ctx.lineTo(-hw, 0);
      ctx.closePath(); ctx.fill();
      
      ctx.globalAlpha = 1; 
      ctx.strokeStyle = hoverK > 0 ? COLORS.eye : ink; 
      ctx.lineWidth = 2; ctx.stroke();
      
      ctx.fillStyle = COLORS.eye; ctx.fillRect(-7, -4, 4, 6); ctx.fillRect(3, -4, 4, 6);
      drawDimensions(0, 0, hw*2, hh*2, 36, 42);

    } else if (modelName === "warden") {
      const hw = 30, hh = 35;
      ctx.shadowBlur = 0;
      if (hoverK > 0) {
        ctx.strokeStyle = COLORS.slam; ctx.globalAlpha = 0.65; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(-60, hh); ctx.lineTo(60, hh); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      
      ctx.fillStyle = COLORS.armored;
      ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
      
      const bx = faceDir * 20;
      ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx, hh - 10 + hoverK * 10); ctx.stroke();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(bx, hh - 10 + hoverK * 10, 6, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(-8, -10, 16, 8);
      drawDimensions(0, 0, hw*2, hh*2, 60, 70);

    } else if (modelName === "iron-colossus") {
      const hw = 36, hh = 40;
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.armored;
      
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      ctx.fillStyle = "#fff"; ctx.fillRect(faceDir * 16 - 8, 14, 16, 11);
      
      const a = -0.4 + hoverK * 1.5;
      const hx = faceDir * hw * 0.5, hy = -4, L = 64;
      const tx = hx + faceDir * Math.cos(a) * L, ty = hy + Math.sin(a) * L;
      
      if (hoverK > 0) {
        ctx.fillStyle = COLORS.charger; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(hx, hy);
        for (let s = 0; s <= 1; s += 0.2) { 
          const aa = -0.4 + (a - -0.4) * s; 
          ctx.lineTo(hx + faceDir * Math.cos(aa) * L, hy + Math.sin(aa) * L); 
        }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      }
      
      ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.atan2(ty - hy, tx - hx)); ctx.fillStyle = ink;
      ctx.fillRect(-6, -14, 26, 28); ctx.restore(); 
      drawDimensions(0, 0, hw*2, hh*2, 72, 80);

    } else if (modelName === "the-echo") {
      const hw = 12, hh = 18;
      ctx.shadowBlur = 0;
      ctx.fillStyle = ink;
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      
      ctx.fillStyle = COLORS.eye; ctx.fillRect(faceDir * 5 - 4, 12, 8, 5);
      
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(faceDir * 22, -26); ctx.stroke();
      
      if (hoverK > 0) {
        ctx.strokeStyle = COLORS.eye; ctx.globalAlpha = 0.5 + 0.4 * hoverK; ctx.lineWidth = 2 + 3 * hoverK; ctx.setLineDash([9, 7]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(faceDir * 60, -40); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(faceDir * 60, -40, 18 - 9 * hoverK, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      drawDimensions(0, 0, hw*2, hh*2, 24, 36);

    } else if (modelName === "the-source") {
      const w = 40, h = 40;
      const core = COLORS.perfect;
      ctx.shadowBlur = 0;
      
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.1 * Math.sin(time); ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(0, 0, w * 1.45, h * 1.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      
      const spin = time * 0.5 * (1 + hoverK * 3);
      ctx.rotate(spin);
      ctx.fillStyle = "#191328";
      ctx.beginPath();
      const pts = 10;
      for (let i = 0; i < pts; i++) { 
        const a = i / pts * Math.PI * 2, r = (i % 2 ? w : w * 0.6) * (1 + 0.07 * Math.sin(time * 3 + i)); 
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); 
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = core; ctx.lineWidth = 3; ctx.stroke();
      ctx.rotate(-spin);
      
      const cr = w * 0.34 * (0.8 + 0.2 * Math.sin(time * 3));
      ctx.globalAlpha = 0.9; ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, cr * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      drawDimensions(0, 0, w*2.9, h*2.9, 116, 116);

    } else if (modelName === "aldric") {
      const hw = 32, hh = 38;
      ctx.fillStyle = COLORS.aldric;
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      ctx.fillStyle = "#fff"; ctx.fillRect(faceDir * 16 - 8, 14, 16, 11);
      
      const wAngle = -0.3 + hoverK * 0.8; 
      const hx = faceDir * hw * 0.5, hy = -4, L = 64;
      const tx = hx + faceDir * Math.cos(wAngle) * L, ty = hy + Math.sin(wAngle) * L;
      
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
