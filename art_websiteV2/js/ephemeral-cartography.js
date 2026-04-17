"use strict";

(function() {
  var CARTO_PALETTE = ['#3d1c02', '#2e1a0e', '#1a1a2e', '#1b3a4b', '#0e2a1a', '#5c1a00', '#2d1b4e', '#3e2c1a', '#4a0e0e', '#0a2e4a', '#2f4f4f', '#1e0e3a', '#8b4513', '#556b2f', '#4a3728', '#6b3a2a'];
  var COASTLINE_POINTS = 36, COASTLINE_JITTER = 0.35, MOUNTAIN_SIZE_MIN = 4, MOUNTAIN_SIZE_MAX = 14, RIVER_MEANDER = 0.4, DEBOUNCE_MS = 200;

  var canvas, ctx, buffer, bufferCtx;
  var mode = 'continent', isDrawing = false, lastX = 0, lastY = 0, dropSize = 40, inkOpacity = 0.7, inkSpread = 1.0, currentColor = CARTO_PALETTE[0];
  var undoStack = [], maxUndo = 8, renderLoop = null, inkBlots = [];
  var landmasses = [], rivers = [], peaks = [], currentRiverPoints = [];
  var generateTimer = null;

  function init() {
    var result = initToolCanvas('carto-canvas');
    if (!result) return;
    canvas = result.canvas; ctx = result.ctx; buffer = result.buffer; bufferCtx = result.bufferCtx;
    inkBlots = generateInkBlotSet(6, 128);
    setupControls(); setupCanvasEvents(); startRenderLoop();
    document.addEventListener('inkwell:paperChange', function(e) { inkSpread = parseFloat(document.getElementById('ink-spread').value) / 10 * e.detail.config.absorption; updateSpreadDisplay(); });
    window.addEventListener('resize', debounce(function() { saveUndoState(); var r2 = initToolCanvas('carto-canvas'); if (r2) { canvas = r2.canvas; ctx = r2.ctx; buffer = r2.buffer; bufferCtx = r2.bufferCtx; } }, 300));
  }

  function setupControls() {
    var cB = document.getElementById('btn-continent-mode'), rB = document.getElementById('btn-river-mode'), mB = document.getElementById('btn-mountain-mode');
    cB.addEventListener('click', function() { mode = 'continent'; cB.className = 'tool-btn tool-btn--primary'; rB.className = 'tool-btn tool-btn--secondary'; mB.className = 'tool-btn tool-btn--secondary'; canvas.style.cursor = 'crosshair'; });
    rB.addEventListener('click', function() { mode = 'river'; rB.className = 'tool-btn tool-btn--primary'; cB.className = 'tool-btn tool-btn--secondary'; mB.className = 'tool-btn tool-btn--secondary'; canvas.style.cursor = 'pointer'; });
    mB.addEventListener('click', function() { mode = 'mountain'; mB.className = 'tool-btn tool-btn--primary'; cB.className = 'tool-btn tool-btn--secondary'; rB.className = 'tool-btn tool-btn--secondary'; canvas.style.cursor = 'cell'; });
    var dsS = document.getElementById('drop-size'), dsV = document.getElementById('drop-size-val');
    dsS.addEventListener('input', function() { dropSize = parseInt(this.value); dsV.textContent = dropSize; });
    var oS = document.getElementById('ink-opacity'), oV = document.getElementById('ink-opacity-val');
    oS.addEventListener('input', function() { inkOpacity = parseInt(this.value) / 100; oV.textContent = inkOpacity.toFixed(2); });
    var sS = document.getElementById('ink-spread'), sV = document.getElementById('ink-spread-val');
    sS.addEventListener('input', function() { var pC = getPaperConfig(); inkSpread = (parseInt(this.value) / 10) * (pC ? pC.absorption : 1); sV.textContent = inkSpread.toFixed(1); });
    var pE = document.getElementById('color-palette');
    CARTO_PALETTE.forEach(function(color, i) { var s = document.createElement('div'); s.className = 'color-swatch' + (i === 0 ? ' color-swatch--active' : ''); s.style.background = color; s.addEventListener('click', function() { currentColor = color; pE.querySelectorAll('.color-swatch').forEach(function(sw) { sw.classList.remove('color-swatch--active'); }); s.classList.add('color-swatch--active'); }); pE.appendChild(s); });
    document.getElementById('btn-clear').addEventListener('click', function() { saveUndoState(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); landmasses = []; rivers = []; peaks = []; currentRiverPoints = []; updateMapStats(); });
    document.getElementById('btn-undo').addEventListener('click', function() { if (undoStack.length === 0) return; var img = undoStack.pop(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); bufferCtx.putImageData(img, 0, 0); landmasses = []; rivers = []; peaks = []; currentRiverPoints = []; });
    document.getElementById('btn-save').addEventListener('click', function() { if (saveToGallery(canvas, 'Ephemeral Cartography')) showToast('Map saved to gallery!'); else showToast('Save failed.'); });
  }

  function updateSpreadDisplay() { var el = document.getElementById('ink-spread-val'); if (el) el.textContent = inkSpread.toFixed(1); }
  function updateMapStats() { var lc = document.getElementById('land-count'), rc = document.getElementById('river-count'), pc = document.getElementById('peak-count'); if (lc) lc.textContent = landmasses.length + ' landmass' + (landmasses.length !== 1 ? 'es' : ''); if (rc) rc.textContent = rivers.length + ' river' + (rivers.length !== 1 ? 's' : ''); if (pc) pc.textContent = peaks.length + ' peak' + (peaks.length !== 1 ? 's' : ''); }

  function setupCanvasEvents() { canvas.addEventListener('pointerdown', onPointerDown); canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('pointerup', onPointerUp); canvas.addEventListener('pointerleave', onPointerUp); }
  function getCanvasPos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }

  function onPointerDown(e) { e.preventDefault(); var pos = getCanvasPos(e); if (mode === 'continent') { saveUndoState(); dropContinent(pos.x, pos.y); } else if (mode === 'mountain') { saveUndoState(); placeMountains(pos.x, pos.y); } else if (mode === 'river') { isDrawing = true; lastX = pos.x; lastY = pos.y; currentRiverPoints = [{ x: pos.x, y: pos.y }]; saveUndoState(); } }
  function onPointerMove(e) { if (!isDrawing || mode !== 'river') return; e.preventDefault(); var pos = getCanvasPos(e); var dx = pos.x - lastX, dy = pos.y - lastY, dist = Math.sqrt(dx * dx + dy * dy); if (dist > 6) { currentRiverPoints.push({ x: pos.x, y: pos.y }); drawRiverSegment(lastX, lastY, pos.x, pos.y); lastX = pos.x; lastY = pos.y; } }
  function onPointerUp(e) { if (!isDrawing) return; isDrawing = false; if (mode === 'river' && currentRiverPoints.length > 2) { rivers.push({ points: currentRiverPoints.slice(), color: currentColor }); updateMapStats(); } currentRiverPoints = []; }

  function dropContinent(x, y) {
    var pC = getPaperConfig(), abs = pC ? pC.absorption : 1.0, rad = dropSize * inkSpread * abs;
    var land = { x: x, y: y, radius: rad, color: currentColor, coastline: generateCoastline(x, y, rad) };
    landmasses.push(land);
    bufferCtx.save(); bufferCtx.globalAlpha = inkOpacity;
    var count = 3 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) { if (inkBlots.length === 0) break; var blot = inkBlots[Math.floor(Math.random() * inkBlots.length)]; var scale = (rad / 64) * (0.6 + Math.random() * 0.8); var offX = (Math.random() - 0.5) * rad * 0.3, offY = (Math.random() - 0.5) * rad * 0.3; var w = 128 * scale, h = 128 * scale; bufferCtx.drawImage(blot, x + offX - w / 2, y + offY - h / 2, w, h); }
    var grad = bufferCtx.createRadialGradient(x, y, 0, x, y, rad); grad.addColorStop(0, currentColor); grad.addColorStop(0.5, currentColor + 'aa'); grad.addColorStop(1, currentColor + '00');
    bufferCtx.fillStyle = grad; bufferCtx.fillRect(x - rad, y - rad, rad * 2, rad * 2); bufferCtx.restore();
    scheduleCoastlineDraw(land); updateMapStats();
  }

  function generateCoastline(cx, cy, radius) { var pts = []; for (var i = 0; i < COASTLINE_POINTS; i++) { var ang = (i / COASTLINE_POINTS) * Math.PI * 2, jit = 1 + (Math.random() - 0.5) * 2 * COASTLINE_JITTER, r = radius * jit; pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r }); } return pts; }
  function scheduleCoastlineDraw(land) { clearTimeout(generateTimer); generateTimer = setTimeout(function() { drawCoastline(land); }, DEBOUNCE_MS); }

  function drawCoastline(land) {
    var cl = land.coastline; if (cl.length < 3) return;
    bufferCtx.save(); bufferCtx.globalAlpha = inkOpacity * 0.8; bufferCtx.strokeStyle = land.color; bufferCtx.lineWidth = 1.5; bufferCtx.lineJoin = 'round'; bufferCtx.lineCap = 'round';
    bufferCtx.beginPath(); bufferCtx.moveTo(cl[0].x, cl[0].y);
    for (var i = 1; i < cl.length; i++) { var curr = cl[i], next = cl[(i + 1) % cl.length]; bufferCtx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2); }
    var last = cl[cl.length - 1], first = cl[0]; bufferCtx.quadraticCurveTo(last.x, last.y, (last.x + first.x) / 2, (last.y + first.y) / 2);
    bufferCtx.closePath(); bufferCtx.stroke(); bufferCtx.globalAlpha = inkOpacity * 0.2; bufferCtx.lineWidth = 3; bufferCtx.stroke(); bufferCtx.restore();
  }

  function placeMountains(x, y) {
    var pC = getPaperConfig(), rough = pC ? pC.roughness : 0.2, count = 3 + Math.floor(Math.random() * 4), cRad = dropSize * 0.8;
    for (var i = 0; i < count; i++) { var ang = Math.random() * Math.PI * 2, dist = Math.random() * cRad; var mx = x + Math.cos(ang) * dist, my = y + Math.sin(ang) * dist, size = MOUNTAIN_SIZE_MIN + Math.random() * (MOUNTAIN_SIZE_MAX - MOUNTAIN_SIZE_MIN); peaks.push({ x: mx, y: my, size: size, color: currentColor }); drawMountain(mx, my, size, rough); }
    updateMapStats();
  }

  function drawMountain(x, y, size, rough) {
    bufferCtx.save(); bufferCtx.globalAlpha = inkOpacity * 0.9; bufferCtx.strokeStyle = currentColor; bufferCtx.fillStyle = currentColor; bufferCtx.lineWidth = 1.2; bufferCtx.lineJoin = 'round';
    var hB = size * 0.6, h = size;
    bufferCtx.beginPath(); bufferCtx.moveTo(x, y - h); bufferCtx.lineTo(x - hB, y); bufferCtx.lineTo(x + hB, y); bufferCtx.closePath(); bufferCtx.stroke();
    bufferCtx.globalAlpha = inkOpacity * 0.15; bufferCtx.fill();
    if (size > 8) { bufferCtx.globalAlpha = inkOpacity * 0.6; bufferCtx.strokeStyle = currentColor; bufferCtx.lineWidth = 0.8; var sH = h * 0.3, sB = hB * 0.3; bufferCtx.beginPath(); bufferCtx.moveTo(x, y - h); bufferCtx.lineTo(x - sB, y - h + sH); bufferCtx.lineTo(x + sB, y - h + sH); bufferCtx.closePath(); bufferCtx.stroke(); }
    bufferCtx.globalAlpha = inkOpacity * 0.3; bufferCtx.lineWidth = 1; bufferCtx.beginPath(); bufferCtx.moveTo(x, y - h); bufferCtx.lineTo(x - hB * 0.5, y - h * 0.4); bufferCtx.stroke();
    if (rough > 0.3) { for (var d = 0; d < 3; d++) { var dx = x + (Math.random() - 0.5) * hB * 2, dy = y + (Math.random() - 0.5) * size * 0.5; bufferCtx.globalAlpha = inkOpacity * 0.2; bufferCtx.beginPath(); bufferCtx.arc(dx, dy, 0.5 + Math.random(), 0, Math.PI * 2); bufferCtx.fill(); } }
    bufferCtx.restore();
  }

  function drawRiverSegment(x1, y1, x2, y2) {
    var pC = getPaperConfig(), abs = pC ? pC.absorption : 1.0;
    bufferCtx.save(); bufferCtx.globalAlpha = inkOpacity * 0.6; bufferCtx.strokeStyle = currentColor; bufferCtx.lineWidth = 1.5 * abs; bufferCtx.lineCap = 'round'; bufferCtx.lineJoin = 'round';
    var dx = x2 - x1, dy = y2 - y1, pX = -dy, pY = dx, pL = Math.sqrt(pX * pX + pY * pY);
    if (pL > 0) { pX /= pL; pY /= pL; }
    var mOff = (Math.random() - 0.5) * RIVER_MEANDER * 20 * abs, mX = (x1 + x2) / 2 + pX * mOff, mY = (y1 + y2) / 2 + pY * mOff;
    bufferCtx.beginPath(); bufferCtx.moveTo(x1, y1); bufferCtx.quadraticCurveTo(mX, mY, x2, y2); bufferCtx.stroke();
    bufferCtx.globalAlpha = inkOpacity * 0.2; bufferCtx.lineWidth = 0.8; bufferCtx.stroke(); bufferCtx.restore();
  }

  function startRenderLoop() { renderLoop = createRenderLoop(function() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(buffer, 0, 0); }); renderLoop.start(); }
  function saveUndoState() { if (!buffer) return; var img = bufferCtx.getImageData(0, 0, buffer.width, buffer.height); undoStack.push(img); if (undoStack.length > maxUndo) undoStack.shift(); }
  function debounce(fn, delay) { var timer; return function() { var args = arguments, ctx = this; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, delay); }; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();