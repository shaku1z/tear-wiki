export function initModelViewer(canvas, modelName) {
  const ctx = canvas.getContext('2d');
  let rafId;
  let t = 0;
  
  let hoverK = 0; // 0 to 1 smooth hover state
  let isHovered = false;
  let mouseX = 0, mouseY = 0;
  
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
  
  window.addEventListener('resize', resize);
  resize();

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
    ink: "#0a0a0d", // Dark background matches wiki bg
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
    
    // Width dimension (bottom)
    const yLine = cy + h/2 + 30;
    ctx.beginPath();
    ctx.moveTo(cx - w/2, yLine - 4); ctx.lineTo(cx - w/2, yLine + 4);
    ctx.moveTo(cx + w/2, yLine - 4); ctx.lineTo(cx + w/2, yLine + 4);
    ctx.moveTo(cx - w/2, yLine); ctx.lineTo(cx + w/2, yLine);
    ctx.stroke();
    ctx.fillText(`${labelX}px`, cx, yLine + 14);
    
    // Height dimension (left)
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
    
    t += 0.05;
    hoverK += ( (isHovered ? 1 : 0) - hoverK ) * 0.1; // ease

    ctx.clearRect(0, 0, width, height);
    drawGrid(width, height);

    // Parallax tilt based on mouse
    const dx = isHovered ? (mouseX - cx) / cx : 0;
    const dy = isHovered ? (mouseY - cy) / cy : 0;
    const floatY = Math.sin(t * 0.5) * (4 - hoverK * 2);
    const modelY = cy + floatY + dy * 10;
    const modelX = cx + dx * 10;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx + dx*2, cy + Math.abs(floatY) + 50, 20 + floatY, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(modelX, modelY);
    // scale up by 1.5 for clarity in viewer
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
      
      // Weapon (axe or sword)
      ctx.save();
      const wAngle = -0.5 + hoverK * 1.2; // raise weapon on hover
      ctx.translate(faceDir * (hw+4), 0);
      ctx.rotate(faceDir * wAngle);
      ctx.fillStyle = ink;
      ctx.fillRect(-2, -18, 4, 24);
      ctx.fillStyle = COLORS.charger;
      ctx.fillRect(-4, -20, 8, 12); // axe head
      ctx.restore();
      
      // Eye
      ctx.fillStyle = "#fff";
      ctx.fillRect(faceDir * 7 - 3, Math.sin(t)*2 - 2, 6, 6);
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
      
      // Eye / Turret
      ctx.fillStyle = ink;
      ctx.fillRect(-2, -r - 4 + hoverK*4, 4, 6); // retracts on hover
      // Laser sight on hover
      if (hoverK > 0) {
        ctx.strokeStyle = COLORS.ranged;
        ctx.globalAlpha = hoverK * 0.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(faceDir * r, 0); ctx.lineTo(faceDir * (r + 100), 0); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(faceDir * 6, Math.sin(t)*2, 4, 0, Math.PI*2); ctx.fill();
      drawDimensions(0, 0, r*2, r*2, 40, 40);

    } else if (modelName === "flyer") {
      const hw = 20, hh = 18, r = hw + 3;
      ctx.fillStyle = COLORS.flyer;
      ctx.beginPath();
      ctx.moveTo(faceDir * r, 0);
      ctx.lineTo(-faceDir * r, -hh + hoverK * 8); // flap wings down on hover
      ctx.lineTo(-faceDir * r * 0.4, 0);
      ctx.lineTo(-faceDir * r, hh - hoverK * 8); // flap wings up on hover
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
      // Fang
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.moveTo(-4, hh - 2); ctx.lineTo(4, hh - 2); ctx.lineTo(0, hh + 6); ctx.fill();
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(faceDir * 8 - 2, -2, 4, 4);
      drawDimensions(0, 0, r*2, hh*2, 46, 36);

    } else if (modelName === "bomber") {
      const hw = 22, hh = 22;
      ctx.fillStyle = COLORS.bomber;
      const pulse = Math.sin(t*2) * 2 * (1 + hoverK);
      ctx.beginPath(); ctx.arc(0, 0, hw + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = ink; ctx.fillRect(-2, -hh - 8, 4, 8); // Launcher
      ctx.fillStyle = "#fff";
      ctx.fillRect(-6, -1, 12, 3);
      drawDimensions(0, 0, hw*2, hw*2, 44, 44);

    } else if (modelName === "armored") {
      const hw = 24, hh = 26;
      ctx.fillStyle = COLORS.armored;
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      // Cyan Shield
      const gx = faceDir * (hw + 9 - hoverK*4); // braces shield on hover
      ctx.fillStyle = COLORS.armoredShield;
      ctx.fillRect(gx - 4, -hh - 6, 8, hh*2 + 12);
      ctx.fillRect(gx - faceDir * 6 - 1, -hh - 6, faceDir * 7, 5);
      ctx.fillRect(gx - faceDir * 6 - 1, hh + 1, faceDir * 7, 5);
      
      ctx.fillStyle = "#fff";
      ctx.fillRect(faceDir * 10 - 3, -6, 6, 6);
      drawDimensions(0, 0, hw*2 + 18, hh*2, 66, 52);

    } else if (modelName === "aldric") {
      const hw = 32, hh = 38;
      ctx.fillStyle = COLORS.aldric;
      ctx.fillRect(-hw, -hh, hw*2, hh*2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(-hw, -hh, hw*2, hh*2);
      
      // Eye
      ctx.fillStyle = "#fff"; ctx.fillRect(faceDir * 16 - 8, 14, 16, 11);
      
      // Big Cleaver
      const wAngle = -0.3 + hoverK * 0.8; 
      const hx = faceDir * hw * 0.5, hy = -4, L = 64;
      const tx = hx + faceDir * Math.cos(wAngle) * L, ty = hy + Math.sin(wAngle) * L;
      
      ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.atan2(ty - hy, tx - hx)); ctx.fillStyle = ink;
      ctx.fillRect(-6, -14, 26, 28); ctx.restore(); // Cleaver head
      
      drawDimensions(0, 0, hw*2, hh*2, 64, 76);
    }
    
    ctx.restore();
  }

  rafId = requestAnimationFrame(render);
  
  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  };
}
