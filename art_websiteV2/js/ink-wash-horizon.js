"use strict";

(function() {
  var HORIZON_PALETTE = ['#1a1a2e', '#2d1b4e', '#1b3a4b', '#3d1c02', '#2e1a0e', '#0e2a1a', '#4a1942', '#1a3c40', '#5c1a00', '#0a2e4a', '#3e2c1a', '#1e0e3a', '#8b0000', '#004040', '#2f4f4f', '#c9a84c'];
  var BEAD_BLOOM_FRAMES = 40;
  var canvas, ctx, buffer, bufferCtx, mode = 'wash', isDrawing = false, lastX = 0, lastY = 0, washWidth = 80, washOpacity = 0.15, washSoftness = 2, beadSize = 20, beadSpread = 1.0, currentColor = HORIZON_PALETTE[0], undoStack = [], maxUndo = 8, renderLoop = null, washCount = 0, beadCount = 0, activeBeads = [];

  function init() {
    var result = initToolCanvas('horizon-canvas');
    if (!result) return;
    canvas = result.canvas; ctx = result.ctx; buffer = result.buffer; bufferCtx = result.bufferCtx;
    setupControls(); setupCanvasEvents(); startRenderLoop();
    document.addEventListener('inkwell:paperChange', function(e) { beadSpread = parseFloat(document.getElementById('bead-spread').value) / 10 * e.detail.config.absorption; updateSpreadDisplay(); });
    window.addEventListener('resize', debounce(function() { saveUndoState(); var r2 = initToolCanvas('horizon-canvas'); if (r2) { canvas = r2.canvas; ctx = r2.ctx; buffer = r2.buffer; bufferCtx = r2.bufferCtx; } }, 300));
  }

  function setupControls() {
    var wB = document.getElementById('btn-wash-mode'), bB = document.getElementById('btn-bead-mode');
    wB.addEventListener('click', function() { mode = 'wash'; wB.className = 'tool-btn tool-btn--primary'; bB.className = 'tool-btn tool-btn--secondary'; canvas.style.cursor = 'crosshair'; });
    bB.addEventListener('click', function() { mode = 'bead'; bB.className = 'tool-btn tool-btn--primary'; wB.className = 'tool-btn tool-btn--secondary'; canvas.style.cursor = 'pointer'; });
    var wwS = document.getElementById('wash-width'), wwV = document.getElementById('wash-width-val');
    wwS.addEventListener('input', function() { washWidth = parseInt(this.value); wwV.textContent = washWidth; });
    var woS = document.getElementById('wash-opacity'), woV = document.getElementById('wash-opacity-val');
    woS.addEventListener('input', function() { washOpacity = parseInt(this.value) / 100; woV.textContent = washOpacity.toFixed(2); });
    var wsS = document.getElementById('wash-softness'), wsV = document.getElementById('wash-softness-val');
    wsS.addEventListener('input', function() { washSoftness = parseInt(this.value); wsV.textContent = washSoftness; });
    var bsS = document.getElementById('bead-size'), bsV = document.getElementById('bead-size-val');
    bsS.addEventListener('input', function() { beadSize = parseInt(this.value); bsV.textContent = beadSize; });
    var bspS = document.getElementById('bead-spread'), bspV = document.getElementById('bead-spread-val');
    bspS.addEventListener('input', function() { var pC = getPaperConfig(); beadSpread = (parseInt(this.value) / 10) * (pC ? pC.absorption : 1); bspV.textContent = beadSpread.toFixed(1); });
    var pE = document.getElementById('color-palette');
    HORIZON_PALETTE.forEach(function(color, i) { var s = document.createElement('div'); s.className = 'color-swatch' + (i === 0 ? ' color-swatch--active' : ''); s.style.background = color; s.addEventListener('click', function() { currentColor = color; pE.querySelectorAll('.color-swatch').forEach(function(sw) { sw.classList.remove('color-swatch--active'); }); s.classList.add('color-swatch--active'); }); pE.appendChild(s); });
    document.getElementById('btn-clear').addEventListener('click', function() { saveUndoState(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); activeBeads = []; washCount = 0; beadCount = 0; updateLayerStats(); });
    document.getElementById('btn-undo').addEventListener('click', function() { if (undoStack.length === 0) return; var img = undoStack.pop(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); bufferCtx.putImageData(img, 0, 0); activeBeads = []; });
    document.getElementById('btn-save').addEventListener('click', function() { if (saveToGallery(canvas, 'Ink-Wash Horizon')) showToast('Artwork saved to gallery!'); else showToast('Save failed.'); });
  }

  function updateSpreadDisplay() { var el = document.getElementById('bead-spread-val'); if (el) el.textContent = beadSpread.toFixed(1); }
  function updateLayerStats() { var wc = document.getElementById('wash-count'), bc = document.getElementById('bead-count'); if (wc) wc.textContent = washCount + ' wash' + (washCount !== 1 ? 'es' : ''); if (bc) bc.textContent = beadCount + ' bead' + (beadCount !== 1 ? 's' : ''); }

  function setupCanvasEvents() { canvas.addEventListener('pointerdown', onPointerDown); canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('pointerup', onPointerUp); canvas.addEventListener('pointerleave', onPointerUp); }
  function getCanvasPos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }

  function onPointerDown(e) { e.preventDefault(); var pos = getCanvasPos(e); if (mode === 'bead') { saveUndoState(); dropBead(pos.x, pos.y); } else { isDrawing = true; lastX = pos.x; lastY = pos.y; saveUndoState(); drawWashStroke(pos.x, pos.y, pos.x + 0.1, pos.y + 0.1); } }
  function onPointerMove(e) { if (!isDrawing || mode !== 'wash') return; e.preventDefault(); var pos = getCanvasPos(e); drawWashStroke(lastX, lastY, pos.x, pos.y); lastX = pos.x; lastY = pos.y; }
  function onPointerUp(e) { if (isDrawing && mode === 'wash') { washCount++; updateLayerStats(); } isDrawing = false; }

  function drawWashStroke(x1, y1, x2, y2) {
    var pC = getPaperConfig(), abs = pC ? pC.absorption : 1.0;
    bufferCtx.save();
    if (washSoftness > 0 && typeof bufferCtx.filter !== 'undefined') bufferCtx.filter = 'blur(' + washSoftness + 'px)';
    bufferCtx.globalAlpha = washOpacity * abs;
    var dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx * dx + dy * dy), angle = Math.atan2(dy, dx);
    var cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.max(washWidth * 0.6, dist / 2 + washWidth * 0.3), ry = washWidth * 0.35;
    bufferCtx.translate(cx, cy); bufferCtx.rotate(angle);
    var grad = bufferCtx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, currentColor); grad.addColorStop(0.3, currentColor + 'aa'); grad.addColorStop(0.6, currentColor + '55'); grad.addColorStop(1, currentColor + '00');
    bufferCtx.fillStyle = grad; bufferCtx.scale(1, ry / rx); bufferCtx.beginPath(); bufferCtx.arc(0, 0, rx, 0, Math.PI * 2); bufferCtx.fill();
    bufferCtx.restore();
  }

  function dropBead(x, y) {
    var pC = getPaperConfig(), abs = pC ? pC.absorption : 1.0;
    var bead = { x: x, y: y, currentRadius: beadSize * 0.3, targetRadius: beadSize * beadSpread * abs * 2, color: currentColor, frame: 0, maxFrames: BEAD_BLOOM_FRAMES, opacity: 0.7 };
    activeBeads.push(bead); beadCount++; updateLayerStats();
  }

  function updateBeads() {
    for (var i = activeBeads.length - 1; i >= 0; i--) {
      var b = activeBeads[i]; b.frame++;
      if (b.frame >= b.maxFrames) { activeBeads.splice(i, 1); continue; }
      var progress = b.frame / b.maxFrames, eased = 1 - Math.pow(1 - progress, 3);
      b.currentRadius = beadSize * 0.3 + (b.targetRadius - beadSize * 0.3) * eased;
      b.opacity = 0.7 * (1 - progress * 0.5);
      bufferCtx.save(); bufferCtx.globalAlpha = b.opacity * 0.15;
      if (typeof bufferCtx.filter !== 'undefined') bufferCtx.filter = 'blur(' + (washSoftness + 1) + 'px)';
      var grad = bufferCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.currentRadius);
      grad.addColorStop(0, b.color + 'cc'); grad.addColorStop(0.3, b.color + '88'); grad.addColorStop(0.6, b.color + '44'); grad.addColorStop(1, b.color + '00');
      bufferCtx.fillStyle = grad; bufferCtx.beginPath(); bufferCtx.arc(b.x, b.y, b.currentRadius, 0, Math.PI * 2); bufferCtx.fill();
      bufferCtx.restore();
    }
  }

  function startRenderLoop() { renderLoop = createRenderLoop(function(delta, qS) { if (qS > 0.4 || Math.random() < qS * 2) updateBeads(); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(buffer, 0, 0); }); renderLoop.start(); }
  function saveUndoState() { if (!buffer) return; var img = bufferCtx.getImageData(0, 0, buffer.width, buffer.height); undoStack.push(img); if (undoStack.length > maxUndo) undoStack.shift(); }
  function debounce(fn, delay) { var timer; return function() { var args = arguments, ctx = this; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, delay); }; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();