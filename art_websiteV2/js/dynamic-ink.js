"use strict";

(function() {
  var INK_PALETTE = ['#1a1a2e', '#0a0a0a', '#2d1b4e', '#1b3a4b', '#3d1c02', '#2e1a0e', '#0e2a1a', '#4a1942', '#8b0000', '#c9a84c', '#1a3c40', '#2f4f4f', '#4a0e0e', '#0a2e4a', '#3e2c1a', '#5c1a00'];
  var MIN_SAMPLE_DIST = 2;

  var canvas, ctx, buffer, bufferCtx;
  var isDrawing = false;
  var currentStroke = [];
  var minWidth = 1, maxWidth = 18, brushOpacity = 1.0, smoothing = 0.5;
  var currentColor = INK_PALETTE[0], lineCap = 'round', strokeCount = 0, totalPoints = 0;
  var undoStack = [], maxUndo = 10, lastVelocity = 0, renderLoop = null;

  function init() {
    var result = initToolCanvas('ink-canvas');
    if (!result) return;
    canvas = result.canvas; ctx = result.ctx; buffer = result.buffer; bufferCtx = result.bufferCtx;
    setupControls(); setupCanvasEvents(); startRenderLoop();
    document.addEventListener('inkwell:paperChange', function(e) {
      smoothing = parseFloat(document.getElementById('smoothing').value) / 100;
      updateSmoothingDisplay();
    });
    window.addEventListener('resize', debounce(function() {
      saveUndoState();
      var r2 = initToolCanvas('ink-canvas');
      if (r2) { canvas = r2.canvas; ctx = r2.ctx; buffer = r2.buffer; bufferCtx = r2.bufferCtx; }
    }, 300));
  }

  function setupControls() {
    var mwS = document.getElementById('min-width'), mwV = document.getElementById('min-width-val');
    mwS.addEventListener('input', function() { minWidth = parseInt(this.value); mwV.textContent = minWidth; });
    var mxS = document.getElementById('max-width'), mxV = document.getElementById('max-width-val');
    mxS.addEventListener('input', function() { maxWidth = parseInt(this.value); mxV.textContent = maxWidth; });
    var oS = document.getElementById('brush-opacity'), oV = document.getElementById('brush-opacity-val');
    oS.addEventListener('input', function() { brushOpacity = parseInt(this.value) / 100; oV.textContent = brushOpacity.toFixed(2); });
    var sS = document.getElementById('smoothing'), sV = document.getElementById('smoothing-val');
    sS.addEventListener('input', function() { smoothing = parseInt(this.value) / 100; sV.textContent = smoothing.toFixed(2); });
    var pE = document.getElementById('color-palette');
    INK_PALETTE.forEach(function(color, i) {
      var s = document.createElement('div');
      s.className = 'color-swatch' + (i === 0 ? ' color-swatch--active' : '');
      s.style.background = color;
      s.addEventListener('click', function() {
        currentColor = color;
        pE.querySelectorAll('.color-swatch').forEach(function(sw) { sw.classList.remove('color-swatch--active'); });
        s.classList.add('color-swatch--active');
      });
      pE.appendChild(s);
    });
    document.getElementById('stroke-style').addEventListener('change', function() { lineCap = this.value; });
    document.getElementById('btn-clear').addEventListener('click', function() {
      saveUndoState(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); currentStroke = []; strokeCount = 0; totalPoints = 0; updateStats();
    });
    document.getElementById('btn-undo').addEventListener('click', function() {
      if (undoStack.length === 0) return;
      var img = undoStack.pop(); bufferCtx.clearRect(0, 0, buffer.width, buffer.height); bufferCtx.putImageData(img, 0, 0); currentStroke = [];
    });
    document.getElementById('btn-save').addEventListener('click', function() {
      if (saveToGallery(canvas, 'Dynamic Ink')) showToast('Artwork saved to gallery!'); else showToast('Save failed.');
    });
  }

  function updateSmoothingDisplay() { var el = document.getElementById('smoothing-val'); if (el) el.textContent = smoothing.toFixed(2); }
  function updateStats() {
    var sc = document.getElementById('stroke-count'), pc = document.getElementById('point-count');
    if (sc) sc.textContent = strokeCount + ' stroke' + (strokeCount !== 1 ? 's' : '');
    if (pc) pc.textContent = totalPoints + ' points';
  }

  function setupCanvasEvents() {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
  }

  function getCanvasPos(e) { var rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top, time: performance.now() }; }

  function onPointerDown(e) {
    e.preventDefault(); isDrawing = true; var pos = getCanvasPos(e); saveUndoState();
    currentStroke = [{ x: pos.x, y: pos.y, time: pos.time, width: maxWidth }]; lastVelocity = 0;
    bufferCtx.save(); bufferCtx.globalAlpha = brushOpacity; bufferCtx.fillStyle = currentColor;
    bufferCtx.beginPath(); bufferCtx.arc(pos.x, pos.y, maxWidth / 2, 0, Math.PI * 2); bufferCtx.fill(); bufferCtx.restore();
  }

  function onPointerMove(e) {
    if (!isDrawing) return; e.preventDefault();
    var pos = getCanvasPos(e), last = currentStroke[currentStroke.length - 1];
    var dx = pos.x - last.x, dy = pos.y - last.y, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MIN_SAMPLE_DIST) return;
    var dt = Math.max(1, pos.time - last.time), velocity = dist / dt;
    lastVelocity = lastVelocity * smoothing + velocity * (1 - smoothing);
    var targetWidth = maxWidth - (maxWidth - minWidth) * Math.min(1, lastVelocity * 2);
    var width = last.width * 0.6 + targetWidth * 0.4;
    var point = { x: pos.x, y: pos.y, time: pos.time, width: width };
    currentStroke.push(point); totalPoints++;
    drawSegment(last, point); updateStats();
  }

  function onPointerUp(e) {
    if (!isDrawing) return; isDrawing = false;
    if (currentStroke.length > 1) { strokeCount++; updateStats(); }
    currentStroke = []; lastVelocity = 0;
  }

  function drawSegment(p1, p2) {
    var paperConfig = getPaperConfig(), roughness = paperConfig ? paperConfig.roughness : 0.2;
    bufferCtx.save(); bufferCtx.globalAlpha = brushOpacity; bufferCtx.strokeStyle = currentColor; bufferCtx.lineCap = lineCap; bufferCtx.lineJoin = 'round';
    var passes = roughness > 0.4 ? 3 : (roughness > 0.15 ? 2 : 1);
    for (var pass = 0; pass < passes; pass++) {
      var wOff = pass === 0 ? 0 : (Math.random() - 0.5) * roughness * 2;
      var aOff = pass === 0 ? 1 : 0.15;
      bufferCtx.globalAlpha = brushOpacity * aOff;
      bufferCtx.lineWidth = Math.max(0.5, p2.width + wOff);
      bufferCtx.beginPath();
      if (currentStroke.length >= 3 && pass === 0) {
        var prev = currentStroke[currentStroke.length - 3] || p1;
        bufferCtx.moveTo((prev.x + p1.x) / 2, (prev.y + p1.y) / 2);
        bufferCtx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      } else {
        var jX = pass > 0 ? (Math.random() - 0.5) * roughness * 3 : 0;
        var jY = pass > 0 ? (Math.random() - 0.5) * roughness * 3 : 0;
        bufferCtx.moveTo(p1.x + jX, p1.y + jY); bufferCtx.lineTo(p2.x + jX, p2.y + jY);
      }
      bufferCtx.stroke();
    }
    if (lastVelocity > 0.8 && currentStroke.length > 2) {
      var prevP = currentStroke[currentStroke.length - 3] || p1;
      var angleChange = Math.abs(Math.atan2(p2.y - p1.y, p2.x - p1.x) - Math.atan2(p1.y - prevP.y, p1.x - prevP.x));
      if (angleChange > 0.3) {
        var splatCount = Math.floor(Math.random() * 3) + 1;
        for (var s = 0; s < splatCount; s++) {
          var sx = p2.x + (Math.random() - 0.5) * p2.width * 2, sy = p2.y + (Math.random() - 0.5) * p2.width * 2, sr = Math.random() * 1.5 + 0.5;
          bufferCtx.globalAlpha = brushOpacity * 0.4; bufferCtx.fillStyle = currentColor; bufferCtx.beginPath(); bufferCtx.arc(sx, sy, sr, 0, Math.PI * 2); bufferCtx.fill();
        }
      }
    }
    bufferCtx.restore();
  }

  function startRenderLoop() {
    renderLoop = createRenderLoop(function() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(buffer, 0, 0); });
    renderLoop.start();
  }

  function saveUndoState() {
    if (!buffer) return;
    var img = bufferCtx.getImageData(0, 0, buffer.width, buffer.height);
    undoStack.push(img); if (undoStack.length > maxUndo) undoStack.shift();
  }

  function debounce(fn, delay) { var timer; return function() { var args = arguments, ctx = this; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, delay); }; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();