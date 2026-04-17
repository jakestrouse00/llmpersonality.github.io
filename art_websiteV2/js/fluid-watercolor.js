"use strict";

(function() {
  var MAX_PARTICLES = 200;
  var PARTICLE_LIFESPAN = 30;
  var DROP_SPRITE_COUNT = 5;

  var WATERCOLOR_PALETTE = [
    '#1a1a2e', '#2d1b4e', '#1b3a4b', '#3d1c02',
    '#2e1a0e', '#0e2a1a', '#4a1942', '#1a3c40',
    '#5c1a00', '#0a2e4a', '#3e2c1a', '#1e0e3a',
    '#c9a84c', '#8b0000', '#004040', '#2f4f4f'
  ];

  var canvas, ctx, buffer, bufferCtx;
  var particles = [];
  var isDrawing = false;
  var lastX = 0, lastY = 0;
  var brushSize = 24;
  var brushOpacity = 0.6;
  var brushBleed = 1.0;
  var currentColor = WATERCOLOR_PALETTE[0];
  var blendMode = 'multiply';
  var strokeCount = 0;
  var undoStack = [];
  var maxUndo = 10;
  var inkBlots = [];
  var renderLoop = null;

  function init() {
    var result = initToolCanvas('watercolor-canvas');
    if (!result) return;
    canvas = result.canvas; ctx = result.ctx; buffer = result.buffer; bufferCtx = result.bufferCtx;
    inkBlots = generateInkBlotSet(6, 128);
    setupControls(); setupCanvasEvents(); startRenderLoop();
    document.addEventListener('inkwell:paperChange', function(e) {
      brushBleed = parseFloat(document.getElementById('brush-bleed').value) / 10 * e.detail.config.absorption;
      updateBleedDisplay();
    });
    window.addEventListener('resize', debounce(function() {
      saveUndoState();
      var result2 = initToolCanvas('watercolor-canvas');
      if (result2) { canvas = result2.canvas; ctx = result2.ctx; buffer = result2.buffer; bufferCtx = result2.bufferCtx; }
    }, 300));
  }

  function setupControls() {
    var sizeSlider = document.getElementById('brush-size'), sizeVal = document.getElementById('brush-size-val');
    sizeSlider.addEventListener('input', function() { brushSize = parseInt(this.value); sizeVal.textContent = brushSize; });
    var opacitySlider = document.getElementById('brush-opacity'), opacityVal = document.getElementById('brush-opacity-val');
    opacitySlider.addEventListener('input', function() { brushOpacity = parseInt(this.value) / 100; opacityVal.textContent = brushOpacity.toFixed(2); });
    var bleedSlider = document.getElementById('brush-bleed'), bleedVal = document.getElementById('brush-bleed-val');
    bleedSlider.addEventListener('input', function() {
      var paperConfig = getPaperConfig();
      brushBleed = (parseInt(this.value) / 10) * paperConfig.absorption;
      bleedVal.textContent = brushBleed.toFixed(1);
    });
    var paletteEl = document.getElementById('color-palette');
    WATERCOLOR_PALETTE.forEach(function(color, i) {
      var swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (i === 0 ? ' color-swatch--active' : '');
      swatch.style.background = color;
      swatch.addEventListener('click', function() {
        currentColor = color;
        paletteEl.querySelectorAll('.color-swatch').forEach(function(s) { s.classList.remove('color-swatch--active'); });
        swatch.classList.add('color-swatch--active');
      });
      paletteEl.appendChild(swatch);
    });
    var blendSelect = document.getElementById('blend-mode');
    blendSelect.addEventListener('change', function() { blendMode = this.value; });
    document.getElementById('btn-clear').addEventListener('click', function() {
      saveUndoState(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); particles = []; strokeCount = 0; updateStrokeCount();
    });
    document.getElementById('btn-undo').addEventListener('click', function() {
      if (undoStack.length === 0) return;
      var imgData = undoStack.pop(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); bufferCtx.putImageData(imgData, 0, 0); particles = [];
    });
    document.getElementById('btn-save').addEventListener('click', function() {
      var id = saveToGallery(canvas, 'Fluid Watercolor');
      if (id) { showToast('Artwork saved to gallery!'); } else { showToast('Save failed — gallery may be full.'); }
    });
  }

  function updateBleedDisplay() { var el = document.getElementById('brush-bleed-val'); if (el) el.textContent = brushBleed.toFixed(1); }
  function updateStrokeCount() { var el = document.getElementById('stroke-count'); if (el) el.textContent = strokeCount + ' stroke' + (strokeCount !== 1 ? 's' : ''); }

  function setupCanvasEvents() {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
  }

  function getCanvasPos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }

  function onPointerDown(e) {
    e.preventDefault(); isDrawing = true; var pos = getCanvasPos(e); lastX = pos.x; lastY = pos.y;
    saveUndoState(); stampDrop(pos.x, pos.y); strokeCount++; updateStrokeCount();
  }

  function onPointerMove(e) {
    if (!isDrawing) return; e.preventDefault(); var pos = getCanvasPos(e);
    var dx = pos.x - lastX, dy = pos.y - lastY, dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.floor(dist / (brushSize * 0.3)));
    for (var i = 0; i < steps; i++) {
      var t = i / steps, px = lastX + dx * t, py = lastY + dy * t;
      emitParticles(px, py, Math.ceil(3 * brushBleed));
    }
    stampDragBlot(pos.x, pos.y); lastX = pos.x; lastY = pos.y;
  }

  function onPointerUp(e) { if (!isDrawing) return; isDrawing = false; }

  function stampDrop(x, y) {
    bufferCtx.save(); bufferCtx.globalCompositeOperation = blendMode; bufferCtx.globalAlpha = brushOpacity;
    var count = DROP_SPRITE_COUNT;
    for (var i = 0; i < count; i++) {
      if (inkBlots.length === 0) break;
      var blot = inkBlots[Math.floor(Math.random() * inkBlots.length)];
      var scale = (brushSize / 64) * (0.8 + Math.random() * 0.6);
      var offsetX = (Math.random() - 0.5) * brushSize * 0.3, offsetY = (Math.random() - 0.5) * brushSize * 0.3;
      var w = 128 * scale, h = 128 * scale;
      bufferCtx.drawImage(blot, x + offsetX - w / 2, y + offsetY - h / 2, w, h);
    }
    var grad = bufferCtx.createRadialGradient(x, y, 0, x, y, brushSize);
    grad.addColorStop(0, currentColor); grad.addColorStop(0.5, currentColor + '88'); grad.addColorStop(1, currentColor + '00');
    bufferCtx.fillStyle = grad; bufferCtx.fillRect(x - brushSize, y - brushSize, brushSize * 2, brushSize * 2);
    bufferCtx.restore();
  }

  function stampDragBlot(x, y) {
    bufferCtx.save(); bufferCtx.globalCompositeOperation = blendMode; bufferCtx.globalAlpha = brushOpacity * 0.4;
    var r = brushSize * 0.6;
    var grad = bufferCtx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, currentColor + 'cc'); grad.addColorStop(0.4, currentColor + '66'); grad.addColorStop(1, currentColor + '00');
    bufferCtx.fillStyle = grad; bufferCtx.beginPath(); bufferCtx.arc(x, y, r, 0, Math.PI * 2); bufferCtx.fill();
    bufferCtx.restore();
  }

  function emitParticles(x, y, count) {
    var paperConfig = getPaperConfig(), absorption = paperConfig ? paperConfig.absorption : 1.0;
    for (var i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      var angle = Math.random() * Math.PI * 2, speed = (0.5 + Math.random() * 1.5) * absorption * brushBleed;
      particles.push({
        x: x + (Math.random() - 0.5) * brushSize * 0.5, y: y + (Math.random() - 0.5) * brushSize * 0.5,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFESPAN, maxLife: PARTICLE_LIFESPAN,
        size: brushSize * (0.1 + Math.random() * 0.2) * absorption, color: currentColor
      });
    }
  }

  function updateParticles() {
    var paperConfig = getPaperConfig(), absorption = paperConfig ? paperConfig.absorption : 1.0;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]; p.life--;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vx += (Math.random() - 0.5) * 0.3 * absorption; p.vy += (Math.random() - 0.5) * 0.3 * absorption;
      p.vx *= 0.95; p.vy *= 0.95; p.x += p.vx; p.y += p.vy;
      var alpha = (p.life / p.maxLife) * brushOpacity * 0.3;
      var r = p.size * (1 + (1 - p.life / p.maxLife) * 0.5);
      bufferCtx.save(); bufferCtx.globalCompositeOperation = blendMode; bufferCtx.globalAlpha = alpha;
      var grad = bufferCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, p.color + '88'); grad.addColorStop(0.5, p.color + '44'); grad.addColorStop(1, p.color + '00');
      bufferCtx.fillStyle = grad; bufferCtx.beginPath(); bufferCtx.arc(p.x, p.y, r, 0, Math.PI * 2); bufferCtx.fill();
      bufferCtx.restore();
    }
  }

  function startRenderLoop() {
    renderLoop = createRenderLoop(function(delta, qualityScale) {
      if (qualityScale > 0.5 || Math.random() < qualityScale * 2) updateParticles();
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(buffer, 0, 0);
    });
    renderLoop.start();
  }

  function saveUndoState() {
    if (!buffer) return;
    var imgData = bufferCtx.getImageData(0, 0, buffer.width, buffer.height);
    undoStack.push(imgData); if (undoStack.length > maxUndo) undoStack.shift();
  }

  function debounce(fn, delay) { var timer; return function() { var args = arguments, context = this; clearTimeout(timer); timer = setTimeout(function() { fn.apply(context, args); }, delay); }; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();