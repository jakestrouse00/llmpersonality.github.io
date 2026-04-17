"use strict";

(function() {
  var GOLD_PALETTE = ['#c9a84c', '#e0c878', '#ffd700', '#b8860b', '#daa520', '#cfb53b'];
  var canvas, ctx, buffer, bufferCtx, isDrawing = false, lastX = 0, lastY = 0, brushWidth = 4, shimmer = 0.5, currentColor = GOLD_PALETTE[0], undoStack = [], maxUndo = 8, renderLoop = null, shards = [], cracks = [], repairedLength = 0, totalCrackLength = 0;

  function init() {
    var result = initToolCanvas('kintsugi-canvas');
    if (!result) return;
    canvas = result.canvas; ctx = result.ctx; buffer = result.buffer; bufferCtx = result.bufferCtx;
    setupControls(); setupCanvasEvents(); generateShatteredComposition(); startRenderLoop();
    window.addEventListener('resize', debounce(function() { saveUndoState(); var r2 = initToolCanvas('kintsugi-canvas'); if (r2) { canvas = r2.canvas; ctx = r2.ctx; buffer = r2.buffer; bufferCtx = r2.bufferCtx; } generateShatteredComposition(); }, 300));
  }

  function setupControls() {
    var bwS = document.getElementById('brush-width'), bwV = document.getElementById('brush-width-val');
    bwS.addEventListener('input', function() { brushWidth = parseInt(this.value); bwV.textContent = brushWidth; });
    var shS = document.getElementById('shimmer'), shV = document.getElementById('shimmer-val');
    shS.addEventListener('input', function() { shimmer = parseInt(this.value) / 100; shV.textContent = shimmer.toFixed(2); });
    var pE = document.getElementById('color-palette');
    GOLD_PALETTE.forEach(function(color, i) { var s = document.createElement('div'); s.className = 'color-swatch' + (i === 0 ? ' color-swatch--active' : ''); s.style.background = color; s.addEventListener('click', function() { currentColor = color; pE.querySelectorAll('.color-swatch').forEach(function(sw) { sw.classList.remove('color-swatch--active'); }); s.classList.add('color-swatch--active'); }); pE.appendChild(s); });
    document.getElementById('btn-reset').addEventListener('click', function() { saveUndoState(); generateShatteredComposition(); });
    document.getElementById('btn-undo').addEventListener('click', function() { if (undoStack.length === 0) return; var img = undoStack.pop(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); bufferCtx.putImageData(img, 0, 0); });
    document.getElementById('btn-save').addEventListener('click', function() { if (saveToGallery(canvas, 'Kintsugi Fragments')) showToast('Masterpiece preserved!'); else showToast('Save failed.'); });
  }

  function updateProgress() { var percent = Math.min(100, Math.floor((repairedLength / totalCrackLength) * 100)); document.getElementById('repair-percent').textContent = percent + '%'; document.getElementById('repair-bar').style.width = percent + '%'; }

  function setupCanvasEvents() { canvas.addEventListener('pointerdown', onPointerDown); canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('pointerup', onPointerUp); canvas.addEventListener('pointerleave', onPointerUp); }
  function getCanvasPos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }

  function onPointerDown(e) { e.preventDefault(); isDrawing = true; var pos = getCanvasPos(e); lastX = pos.x; lastY = pos.y; saveUndoState(); }
  function onPointerMove(e) { if (!isDrawing) return; e.preventDefault(); var pos = getCanvasPos(e); var snapped = snapToCrack(pos.x, pos.y); var drawX = snapped ? snapped.x : pos.x; var drawY = snapped ? snapped.y : pos.y; drawGoldLine(lastX, lastY, drawX, drawY); lastX = drawX; lastY = drawY; }
  function onPointerUp(e) { isDrawing = false; }

  function snapToCrack(x, y) { var minDist = 15, closest = null; cracks.forEach(function(crack) { var d = distToSegment({x: x, y: y}, crack.p1, crack.p2); if (d < minDist) { minDist = d; closest = projectPointOnSegment({x: x, y: y}, crack.p1, crack.p2); } }); return closest; }

  function drawGoldLine(x1, y1, x2, y2) {
    bufferCtx.save(); bufferCtx.strokeStyle = currentColor; bufferCtx.lineWidth = brushWidth; bufferCtx.lineCap = 'round'; bufferCtx.lineJoin = 'round';
    bufferCtx.shadowBlur = 5 * shimmer; bufferCtx.shadowColor = currentColor;
    bufferCtx.beginPath(); bufferCtx.moveTo(x1, y1); bufferCtx.lineTo(x2, y2); bufferCtx.stroke(); bufferCtx.restore();
    var dist = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1)); repairedLength += dist * 0.5; updateProgress();
  }

  function generateShatteredComposition() {
    bufferCtx.clearRect(0, 0, buffer.width, buffer.height); cracks = []; repairedLength = 0; totalCrackLength = 0;
    var grad = bufferCtx.createRadialGradient(buffer.width/2, buffer.height/2, 0, buffer.width/2, buffer.height/2, buffer.width/2);
    grad.addColorStop(0, '#f0e8d8'); grad.addColorStop(1, '#d0c8b8'); bufferCtx.fillStyle = grad; bufferCtx.fillRect(0, 0, buffer.width, buffer.height);
    var blots = generateInkBlotSet(3, 256);
    blots.forEach(function(blot) { var x = Math.random() * buffer.width * 0.5 + buffer.width * 0.25, y = Math.random() * buffer.height * 0.5 + buffer.height * 0.25; bufferCtx.globalAlpha = 0.9; bufferCtx.drawImage(blot, x - 128, y - 128, 256, 256); });
    var centerX = buffer.width / 2, centerY = buffer.height / 2, numCracks = 12 + Math.floor(Math.random() * 8);
    for (var i = 0; i < numCracks; i++) { var angle = Math.random() * Math.PI * 2, len = 100 + Math.random() * 300; var p1 = { x: centerX + Math.cos(angle) * 20, y: centerY + Math.sin(angle) * 20 }; var p2 = { x: centerX + Math.cos(angle) * len, y: centerY + Math.sin(angle) * len }; cracks.push({ p1: p1, p2: p2 }); totalCrackLength += Math.sqrt((p2.x-p1.x)*(p2.x-p1.x) + (p2.y-p1.y)*(p2.y-p1.y)); bufferCtx.strokeStyle = '#f8f4ec'; bufferCtx.lineWidth = 3 + Math.random() * 3; bufferCtx.beginPath(); bufferCtx.moveTo(p1.x, p1.y); bufferCtx.lineTo(p2.x, p2.y); bufferCtx.stroke(); }
    updateProgress();
  }

  function startRenderLoop() { renderLoop = createRenderLoop(function() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(buffer, 0, 0); }); renderLoop.start(); }
  function saveUndoState() { if (!buffer) return; var img = bufferCtx.getImageData(0, 0, buffer.width, buffer.height); undoStack.push(img); if (undoStack.length > maxUndo) undoStack.shift(); }

  function distToSegment(p, v, w) { var l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y); if (l2 == 0) return Math.sqrt((p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y)); var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2; t = Math.max(0, Math.min(1, t)); return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2)); }
  function projectPointOnSegment(p, v, w) { var l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y); if (l2 == 0) return v; var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2; t = Math.max(0, Math.min(1, t)); return { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }; }
  function debounce(fn, delay) { var timer; return function() { var args = arguments, ctx = this; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, delay); }; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();