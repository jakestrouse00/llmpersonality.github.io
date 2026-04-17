"use strict";

(function() {
  var GRAVITY_PALETTE = ['#1a1a2e', '#0a0a0a', '#2d1b4e', '#1b3a4b', '#3d1c02', '#2e1a0e', '#0e2a1a', '#4a1942', '#8b0000', '#5c1a00', '#1a3c40', '#2f4f4f', '#4a0e0e', '#0a2e4a', '#3e2c1a', '#c9a84c'];
  var MAX_DRIPS = 500, DRIP_TRAIL_LENGTH = 8;
  var canvas, ctx, buffer, bufferCtx, drips = [], splatterForce = 0.7, splatterCount = 12, dropSize = 6, tiltX = 0, tiltY = 0, viscosity = 0.5, gravity = 0.3, currentColor = GRAVITY_PALETTE[0], undoStack = [], maxUndo = 8, renderLoop = null, totalSplatters = 0;

  function init() {
    var result = initToolCanvas('gravity-canvas');
    if (!result) return;
    canvas = result.canvas; ctx = result.ctx; buffer = result.buffer; bufferCtx = result.bufferCtx;
    setupControls(); setupCanvasEvents(); startRenderLoop();
    window.addEventListener('resize', debounce(function() { saveUndoState(); var r2 = initToolCanvas('gravity-canvas'); if (r2) { canvas = r2.canvas; ctx = r2.ctx; buffer = r2.buffer; bufferCtx = r2.bufferCtx; } }, 300));
  }

  function setupControls() {
    var sfS = document.getElementById('splatter-force'), sfV = document.getElementById('splatter-force-val');
    sfS.addEventListener('input', function() { splatterForce = parseInt(this.value) / 100; sfV.textContent = splatterForce.toFixed(2); });
    var scS = document.getElementById('splatter-count'), scV = document.getElementById('splatter-count-val');
    scS.addEventListener('input', function() { splatterCount = parseInt(this.value); scV.textContent = splatterCount; });
    var dsS = document.getElementById('drop-size'), dsV = document.getElementById('drop-size-val');
    dsS.addEventListener('input', function() { dropSize = parseInt(this.value); dsV.textContent = dropSize; });
    var txS = document.getElementById('tilt-x'), txV = document.getElementById('tilt-x-val');
    txS.addEventListener('input', function() { tiltX = parseInt(this.value); txV.textContent = tiltX; });
    var tyS = document.getElementById('tilt-y'), tyV = document.getElementById('tilt-y-val');
    tyS.addEventListener('input', function() { tiltY = parseInt(this.value); tyV.textContent = tiltY; });
    var viS = document.getElementById('viscosity'), viV = document.getElementById('viscosity-val');
    viS.addEventListener('input', function() { viscosity = parseInt(this.value) / 100; viV.textContent = viscosity.toFixed(2); });
    var grS = document.getElementById('gravity'), grV = document.getElementById('gravity-val');
    grS.addEventListener('input', function() { gravity = parseInt(this.value) / 100; grV.textContent = gravity.toFixed(2); });
    var pE = document.getElementById('color-palette');
    GRAVITY_PALETTE.forEach(function(color, i) { var s = document.createElement('div'); s.className = 'color-swatch' + (i === 0 ? ' color-swatch--active' : ''); s.style.background = color; s.addEventListener('click', function() { currentColor = color; pE.querySelectorAll('.color-swatch').forEach(function(sw) { sw.classList.remove('color-swatch--active'); }); s.classList.add('color-swatch--active'); }); pE.appendChild(s); });
    document.getElementById('btn-clear').addEventListener('click', function() { saveUndoState(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); drips = []; totalSplatters = 0; updateStats(); });
    document.getElementById('btn-undo').addEventListener('click', function() { if (undoStack.length === 0) return; var img = undoStack.pop(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); bufferCtx.putImageData(img, 0, 0); drips = []; });
    document.getElementById('btn-save').addEventListener('click', function() { if (saveToGallery(canvas, "Gravity's Ink")) showToast('Artwork saved to gallery!'); else showToast('Save failed.'); });
  }

  function updateStats() { var dc = document.getElementById('drip-count'), sc = document.getElementById('splatter-count-stat'); if (dc) dc.textContent = drips.length + ' active drip' + (drips.length !== 1 ? 's' : ''); if (sc) sc.textContent = totalSplatters + ' splatter' + (totalSplatters !== 1 ? 's' : ''); }

  function setupCanvasEvents() { canvas.addEventListener('pointerdown', onPointerDown); }
  function getCanvasPos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }
  function onPointerDown(e) { e.preventDefault(); var pos = getCanvasPos(e); saveUndoState(); createSplatter(pos.x, pos.y); totalSplatters++; updateStats(); }

  function createSplatter(x, y) {
    var paperConfig = getPaperConfig(), absorption = paperConfig ? paperConfig.absorption : 1.0;
    bufferCtx.save(); bufferCtx.globalAlpha = 0.85;
    var blotR = dropSize * 2;
    var grad = bufferCtx.createRadialGradient(x, y, 0, x, y, blotR);
    grad.addColorStop(0, currentColor); grad.addColorStop(0.4, currentColor + 'cc'); grad.addColorStop(0.7, currentColor + '66'); grad.addColorStop(1, currentColor + '00');
    bufferCtx.fillStyle = grad; bufferCtx.beginPath(); bufferCtx.arc(x, y, blotR, 0, Math.PI * 2); bufferCtx.fill(); bufferCtx.restore();
    for (var i = 0; i < splatterCount; i++) {
      var angle = Math.random() * Math.PI * 2, speed = (2 + Math.random() * 8) * splatterForce, size = dropSize * (0.2 + Math.random() * 0.6);
      var vx = Math.cos(angle) * speed + tiltX * 0.05, vy = Math.sin(angle) * speed + tiltY * 0.05;
      if (drips.length >= MAX_DRIPS) drips.shift();
      drips.push({ x: x, y: y, vx: vx, vy: vy, size: size, color: currentColor, life: 1.0, decay: 0.005 + viscosity * 0.01, trail: [], isSplatter: true, settled: false });
    }
    var dripCount = 2 + Math.floor(Math.random() * 3);
    for (var d = 0; d < dripCount; d++) {
      var dAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.5, dSpeed = 0.5 + Math.random() * 1.5;
      if (drips.length >= MAX_DRIPS) drips.shift();
      drips.push({ x: x + (Math.random() - 0.5) * dropSize, y: y + dropSize, vx: Math.cos(dAngle) * dSpeed * 0.3, vy: Math.sin(dAngle) * dSpeed, size: dropSize * (0.3 + Math.random() * 0.4), color: currentColor, life: 1.0, decay: 0.003 + viscosity * 0.005, trail: [], isSplatter: false, settled: false });
    }
  }

  function updateDrips() {
    var paperConfig = getPaperConfig(), absorption = paperConfig ? paperConfig.absorption : 1.0;
    var tiltAccX = tiltX * 0.02 * gravity, tiltAccY = tiltY * 0.02 * gravity, baseGravY = gravity * 0.15;
    for (var i = drips.length - 1; i >= 0; i--) {
      var d = drips[i];
      if (d.settled) { drips.splice(i, 1); continue; }
      d.vx += tiltAccX; d.vy += tiltAccY + baseGravY;
      var damping = 1 - viscosity * 0.03; d.vx *= damping; d.vy *= damping;
      d.x += d.vx; d.y += d.vy;
      d.trail.push({ x: d.x, y: d.y }); if (d.trail.length > DRIP_TRAIL_LENGTH) d.trail.shift();
      d.life -= d.decay;
      var rect = canvas.getBoundingClientRect(), w = rect.width, h = rect.height;
      if (d.x < 0 || d.x > w || d.y < 0 || d.y > h || d.life <= 0) { if (d.life > 0 || d.trail.length > 0) stampDrip(d, absorption); drips.splice(i, 1); continue; }
      var speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
      if (speed < 0.1 && d.life < 0.3) { stampDrip(d, absorption); d.settled = true; }
      drawDrip(d, absorption);
    }
    updateStats();
  }

  function drawDrip(d, absorption) {
    bufferCtx.save();
    if (d.trail.length > 1) { bufferCtx.globalAlpha = d.life * 0.3; bufferCtx.strokeStyle = d.color; bufferCtx.lineWidth = Math.max(0.5, d.size * 0.5); bufferCtx.lineCap = 'round'; bufferCtx.lineJoin = 'round'; bufferCtx.beginPath(); bufferCtx.moveTo(d.trail[0].x, d.trail[0].y); for (var t = 1; t < d.trail.length; t++) { bufferCtx.lineTo(d.trail[t].x, d.trail[t].y); } bufferCtx.stroke(); }
    bufferCtx.globalAlpha = d.life * 0.7;
    var r = d.size * (0.5 + absorption * 0.3);
    var grad = bufferCtx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r);
    grad.addColorStop(0, d.color); grad.addColorStop(0.5, d.color + '88'); grad.addColorStop(1, d.color + '00');
    bufferCtx.fillStyle = grad; bufferCtx.beginPath(); bufferCtx.arc(d.x, d.y, r, 0, Math.PI * 2); bufferCtx.fill();
    bufferCtx.restore();
  }

  function stampDrip(d, absorption) {
    bufferCtx.save(); bufferCtx.globalAlpha = 0.3 * absorption;
    var r = d.size * absorption;
    var grad = bufferCtx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r);
    grad.addColorStop(0, d.color + 'aa'); grad.addColorStop(0.5, d.color + '44'); grad.addColorStop(1, d.color + '00');
    bufferCtx.fillStyle = grad; bufferCtx.beginPath(); bufferCtx.arc(d.x, d.y, r, 0, Math.PI * 2); bufferCtx.fill(); bufferCtx.restore();
  }

  function startRenderLoop() { renderLoop = createRenderLoop(function(delta, qualityScale) { if (qualityScale > 0.4 || Math.random() < qualityScale * 2) updateDrips(); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(buffer, 0, 0); }); renderLoop.start(); }
  function saveUndoState() { if (!buffer) return; var img = bufferCtx.getImageData(0, 0, buffer.width, buffer.height); undoStack.push(img); if (undoStack.length > maxUndo) undoStack.shift(); }
  function debounce(fn, delay) { var timer; return function() { var args = arguments, ctx = this; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, delay); }; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();