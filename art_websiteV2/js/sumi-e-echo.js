"use strict";

(function() {
  var SUMI_PALETTE = ['#1a1a2e', '#0a0a0a', '#2d2d44', '#3a3a3a', '#4a4a4a', '#1b3a4b', '#2e1a0e', '#0e2a1a', '#3e2c1a', '#2f4f4f', '#1e0e3a', '#4a0e0e'];
  var RIPPLE_MAX_RADIUS = 200, RIPPLE_SPEED = 1.5, RIPPLE_FADE_RATE = 0.015;

  var canvas, ctx, buffer, bufferCtx;
  var mode = 'stone', stones = [], ripples = [], isDrawing = false, lastX = 0, lastY = 0;
  var stoneSize = 30, stoneOpacity = 0.9, rippleSpread = 1.0, rippleRings = 5, currentColor = SUMI_PALETTE[0];
  var undoStack = [], maxUndo = 8, renderLoop = null, inkBlots = [];

  function init() {
    var result = initToolCanvas('sumie-canvas');
    if (!result) return;
    canvas = result.canvas; ctx = result.ctx; buffer = result.buffer; bufferCtx = result.bufferCtx;
    inkBlots = generateInkBlotSet(6, 128);
    setupControls(); setupCanvasEvents(); startRenderLoop();
    document.addEventListener('inkwell:paperChange', function(e) {
      rippleSpread = parseFloat(document.getElementById('ripple-spread').value) / 10 * e.detail.config.absorption;
      updateSpreadDisplay();
    });
    window.addEventListener('resize', debounce(function() {
      saveUndoState();
      var r2 = initToolCanvas('sumie-canvas');
      if (r2) { canvas = r2.canvas; ctx = r2.ctx; buffer = r2.buffer; bufferCtx = r2.bufferCtx; }
    }, 300));
  }

  function setupControls() {
    var stoneBtn = document.getElementById('btn-stone-mode'), flowBtn = document.getElementById('btn-flow-mode');
    stoneBtn.addEventListener('click', function() { mode = 'stone'; stoneBtn.className = 'tool-btn tool-btn--primary'; flowBtn.className = 'tool-btn tool-btn--secondary'; canvas.style.cursor = 'crosshair'; });
    flowBtn.addEventListener('click', function() { mode = 'flow'; flowBtn.className = 'tool-btn tool-btn--primary'; stoneBtn.className = 'tool-btn tool-btn--secondary'; canvas.style.cursor = 'pointer'; });
    var sS = document.getElementById('stone-size'), sV = document.getElementById('stone-size-val');
    sS.addEventListener('input', function() { stoneSize = parseInt(this.value); sV.textContent = stoneSize; });
    var oS = document.getElementById('stone-opacity'), oV = document.getElementById('stone-opacity-val');
    oS.addEventListener('input', function() { stoneOpacity = parseInt(this.value) / 100; oV.textContent = stoneOpacity.toFixed(2); });
    var rS = document.getElementById('ripple-spread'), rV = document.getElementById('ripple-spread-val');
    rS.addEventListener('input', function() { var pC = getPaperConfig(); rippleSpread = (parseInt(this.value) / 10) * (pC ? pC.absorption : 1); rV.textContent = rippleSpread.toFixed(1); });
    var rgS = document.getElementById('ripple-rings'), rgV = document.getElementById('ripple-rings-val');
    rgS.addEventListener('input', function() { rippleRings = parseInt(this.value); rgV.textContent = rippleRings; });
    var pE = document.getElementById('color-palette');
    SUMI_PALETTE.forEach(function(color, i) {
      var s = document.createElement('div');
      s.className = 'color-swatch' + (i === 0 ? ' color-swatch--active' : '');
      s.style.background = color;
      s.addEventListener('click', function() { currentColor = color; pE.querySelectorAll('.color-swatch').forEach(function(sw) { sw.classList.remove('color-swatch--active'); }); s.classList.add('color-swatch--active'); });
      pE.appendChild(s);
    });
    document.getElementById('btn-clear').addEventListener('click', function() { saveUndoState(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); stones = []; ripples = []; updateGardenStats(); });
    document.getElementById('btn-undo').addEventListener('click', function() { if (undoStack.length === 0) return; var img = undoStack.pop(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); bufferCtx.putImageData(img, 0, 0); stones = []; ripples = []; });
    document.getElementById('btn-save').addEventListener('click', function() { if (saveToGallery(canvas, 'Sumi-e Echo')) showToast('Artwork saved to gallery!'); else showToast('Save failed.'); });
  }

  function updateSpreadDisplay() { var el = document.getElementById('ripple-spread-val'); if (el) el.textContent = rippleSpread.toFixed(1); }
  function updateGardenStats() {
    var sc = document.getElementById('stone-count'), rc = document.getElementById('ripple-count');
    if (sc) sc.textContent = stones.length + ' stone' + (stones.length !== 1 ? 's' : '');
    if (rc) rc.textContent = ripples.length + ' ripple' + (ripples.length !== 1 ? 's' : '');
  }

  function setupCanvasEvents() { canvas.addEventListener('pointerdown', onPointerDown); canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('pointerup', onPointerUp); canvas.addEventListener('pointerleave', onPointerUp); }
  function getCanvasPos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }

  function onPointerDown(e) {
    e.preventDefault(); var pos = getCanvasPos(e);
    if (mode === 'stone') { saveUndoState(); placeStone(pos.x, pos.y); } else { isDrawing = true; lastX = pos.x; lastY = pos.y; saveUndoState(); }
  }

  function onPointerMove(e) {
    if (!isDrawing || mode !== 'flow') return; e.preventDefault(); var pos = getCanvasPos(e);
    var dx = pos.x - lastX, dy = pos.y - lastY, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8) { createRipple(pos.x, pos.y, dx, dy); drawFlowTrail(lastX, lastY, pos.x, pos.y); lastX = pos.x; lastY = pos.y; }
  }

  function onPointerUp(e) { isDrawing = false; }

  function placeStone(x, y) {
    stones.push({ x: x, y: y, radius: stoneSize, color: currentColor, opacity: stoneOpacity });
    bufferCtx.save(); bufferCtx.globalAlpha = stoneOpacity;
    var count = 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count; i++) {
      if (inkBlots.length === 0) break;
      var blot = inkBlots[Math.floor(Math.random() * inkBlots.length)];
      var scale = (stoneSize / 64) * (0.7 + Math.random() * 0.6);
      var offX = (Math.random() - 0.5) * stoneSize * 0.2, offY = (Math.random() - 0.5) * stoneSize * 0.2;
      var w = 128 * scale, h = 128 * scale;
      bufferCtx.drawImage(blot, x + offX - w / 2, y + offY - h / 2, w, h);
    }
    var grad = bufferCtx.createRadialGradient(x, y, 0, x, y, stoneSize);
    grad.addColorStop(0, currentColor); grad.addColorStop(0.6, currentColor + 'aa'); grad.addColorStop(1, currentColor + '00');
    bufferCtx.fillStyle = grad; bufferCtx.beginPath(); bufferCtx.arc(x, y, stoneSize, 0, Math.PI * 2); bufferCtx.fill();
    bufferCtx.restore();
    createRipple(x, y, 0, 0); updateGardenStats();
  }

  function createRipple(x, y, dx, dy) {
    var angle = Math.atan2(dy, dx), deflectedAngle = angle, nearestStoneDist = Infinity;
    stones.forEach(function(stone) {
      var sdx = x - stone.x, sdy = y - stone.y, sDist = Math.sqrt(sdx * sdx + sdy * sdy);
      if (sDist < stone.radius * 3 && sDist < nearestStoneDist) {
        nearestStoneDist = sDist;
        var deflectAngle = Math.atan2(sdy, sdx);
        var influence = Math.max(0, 1 - sDist / (stone.radius * 3));
        deflectedAngle = angle + (deflectAngle - angle) * influence * 0.6;
      }
    });
    ripples.push({ x: x, y: y, radius: 5, maxRadius: RIPPLE_MAX_RADIUS * rippleSpread, angle: deflectedAngle, opacity: 0.6, rings: rippleRings, color: currentColor, speed: RIPPLE_SPEED * rippleSpread, hasDirection: (dx !== 0 || dy !== 0) });
    updateGardenStats();
  }

  function updateRipples() {
    for (var i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i]; r.radius += r.speed; r.opacity -= RIPPLE_FADE_RATE;
      if (r.opacity <= 0 || r.radius >= r.maxRadius) { ripples.splice(i, 1); continue; }
      bufferCtx.save(); bufferCtx.globalAlpha = r.opacity;
      for (var ring = 0; ring < r.rings; ring++) {
        var ringRadius = r.radius - ring * (r.radius / r.rings);
        if (ringRadius < 1) continue;
        var ringOpacity = r.opacity * (1 - ring / r.rings) * 0.5;
        bufferCtx.globalAlpha = ringOpacity; bufferCtx.strokeStyle = r.color; bufferCtx.lineWidth = Math.max(0.5, 2 - ring * 0.3);
        bufferCtx.beginPath();
        if (r.hasDirection) { var arcSpan = Math.PI * 0.8; bufferCtx.arc(r.x, r.y, ringRadius, r.angle - arcSpan / 2, r.angle + arcSpan / 2); }
        else { bufferCtx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2); }
        bufferCtx.stroke();
      }
      bufferCtx.restore();
    }
  }

  function drawFlowTrail(x1, y1, x2, y2) {
    var paperConfig = getPaperConfig(), absorption = paperConfig ? paperConfig.absorption : 1.0;
    bufferCtx.save(); bufferCtx.strokeStyle = currentColor; bufferCtx.lineWidth = 1.5; bufferCtx.lineCap = 'round';
    var dx = x2 - x1, dy = y2 - y1, perpX = -dy, perpY = dx, perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
    if (perpLen > 0) { perpX /= perpLen; perpY /= perpLen; }
    var lineCount = 5 + Math.floor(absorption * 3), spacing = 3;
    for (var i = -Math.floor(lineCount / 2); i <= Math.floor(lineCount / 2); i++) {
      var offX = perpX * i * spacing, offY = perpY * i * spacing, jitter = (Math.random() - 0.5) * 0.5;
      bufferCtx.globalAlpha = 0.08 * absorption * (1 - Math.abs(i) / (lineCount / 2 + 1));
      bufferCtx.beginPath(); bufferCtx.moveTo(x1 + offX + jitter, y1 + offY + jitter); bufferCtx.lineTo(x2 + offX + jitter, y2 + offY + jitter); bufferCtx.stroke();
    }
    bufferCtx.restore();
  }

  function startRenderLoop() {
    renderLoop = createRenderLoop(function(delta, qualityScale) {
      if (qualityScale > 0.4 || Math.random() < qualityScale * 2) updateRipples();
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(buffer, 0, 0);
    });
    renderLoop.start();
  }

  function saveUndoState() { if (!buffer) return; var img = bufferCtx.getImageData(0, 0, buffer.width, buffer.height); undoStack.push(img); if (undoStack.length > maxUndo) undoStack.shift(); }
  function debounce(fn, delay) { var timer; return function() { var args = arguments, ctx = this; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, delay); }; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();