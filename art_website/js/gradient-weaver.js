(function() {
  'use strict';

  var GW = {};
  var canvasObj, loopId;
  var isDrawing = false;
  var startPos = null;
  var currentPos = null;
  var washes = [];
  var noiseTextures = {};

  var settings = { softness: 50, transparency: 40, grain: 30, color: '#3a4a5a', washType: 'linear' };

  function buildNoiseTextures() {
    var size = 128;
    for (var intensity = 0; intensity <= 100; intensity += 10) {
      var threshold = 255 * (1 - intensity / 100);
      var nc = document.createElement('canvas');
      nc.width = nc.height = size;
      var nctx = nc.getContext('2d');
      var imageData = nctx.createImageData(size, size);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var val = Math.random() * 255;
        var alpha = val < threshold ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = alpha;
      }
      nctx.putImageData(imageData, 0, 0);
      noiseTextures[intensity] = nc;
    }
  }

  function applyGrainMask(ctx, x, y, w, h, grainAmount) {
    if (grainAmount <= 0) return;
    var intensity = Math.round(grainAmount / 10) * 10;
    intensity = Math.max(0, Math.min(100, intensity));
    var texture = noiseTextures[intensity];
    if (!texture) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.globalAlpha = 0.85;
    var pattern = ctx.createPattern(texture, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  function drawWash(ctx, x1, y1, x2, y2, options) {
    var rgb = Inkwell.hexToRgb(options.color);
    var softness = (options.softness || 50) / 100;
    var transparency = (options.transparency || 40) / 100;
    var grain = (options.grain || 30) / 100;
    var washType = options.washType || 'linear';

    var dx = x2 - x1, dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    var angle = Math.atan2(dy, dx);
    var spread = dist * (0.5 + softness * 1.5);

    ctx.save();
    var grad;
    if (washType === 'radial') {
      var radius = Math.max(10, dist * (0.3 + softness * 0.7));
      grad = ctx.createRadialGradient(x1, y1, 0, x1, y1, radius);
    } else {
      grad = ctx.createLinearGradient(x1, y1, x2, y2);
    }

    var alpha = transparency * 0.6;
    var inner = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
    var mid = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (alpha * 0.4) + ')';
    var outer = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)';

    if (washType === 'radial') {
      grad.addColorStop(0, inner); grad.addColorStop(0.4, mid); grad.addColorStop(1, outer);
    } else {
      grad.addColorStop(0, inner); grad.addColorStop(0.5, mid); grad.addColorStop(1, outer);
    }

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = grad;

    if (washType === 'radial') {
      var radius = Math.max(10, dist * (0.3 + softness * 0.7));
      ctx.beginPath(); ctx.arc(x1, y1, radius, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.translate(x1, y1); ctx.rotate(angle);
      ctx.fillRect(0, -spread, dist, spread * 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();

    if (grain > 0.05) {
      var regionX, regionY, regionW, regionH;
      if (washType === 'radial') {
        var radius = Math.max(10, dist * (0.3 + softness * 0.7));
        regionX = x1 - radius; regionY = y1 - radius; regionW = radius * 2; regionH = radius * 2;
      } else {
        regionX = Math.min(x1, x2) - spread; regionY = Math.min(y1, y2) - spread;
        regionW = Math.abs(x2 - x1) + spread * 2; regionH = Math.abs(y2 - y1) + spread * 2;
      }
      regionX = Math.max(0, Math.floor(regionX)); regionY = Math.max(0, Math.floor(regionY));
      regionW = Math.min(canvasObj.width - regionX, Math.ceil(regionW));
      regionH = Math.min(canvasObj.height - regionY, Math.ceil(regionH));
      if (regionW > 0 && regionH > 0) {
        applyGrainMask(ctx, regionX, regionY, regionW, regionH, grain * 100);
      }
    }
  }

  function drawPreview() {
    if (!isDrawing || !startPos || !currentPos) return;
    canvasObj.ctx.clearRect(0, 0, canvasObj.width, canvasObj.height);
    canvasObj.ctx.drawImage(canvasObj.offscreen, 0, 0);
    drawWash(canvasObj.ctx, startPos.x, startPos.y, currentPos.x, currentPos.y, {
      color: settings.color, softness: settings.softness, transparency: settings.transparency, grain: settings.grain, washType: settings.washType
    });
  }

  function commitWash() {
    if (!startPos || !currentPos) return;
    drawWash(canvasObj.offCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, {
      color: settings.color, softness: settings.softness, transparency: settings.transparency, grain: settings.grain, washType: settings.washType
    });
    washes.push({
      x1: startPos.x, y1: startPos.y, x2: currentPos.x, y2: currentPos.y,
      color: settings.color, softness: settings.softness, transparency: settings.transparency, grain: settings.grain, washType: settings.washType
    });
    canvasObj.ctx.clearRect(0, 0, canvasObj.width, canvasObj.height);
    canvasObj.ctx.drawImage(canvasObj.offscreen, 0, 0);
  }

  GW.init = function() {
    buildNoiseTextures();
    var container = document.getElementById('canvas-container');
    canvasObj = Inkwell.createCanvas(container);

    var params = new URLSearchParams(window.location.search);
    var remixId = params.get('remix');
    if (remixId) {
      var gallery = Inkwell.loadGallery();
      for (var i = 0; i < gallery.length; i++) {
        if (gallery[i].id === remixId && gallery[i].tool === 'gradient-weaver') {
          GW.renderBlueprint(canvasObj.offscreen, gallery[i].blueprint);
          canvasObj.ctx.drawImage(canvasObj.offscreen, 0, 0);
          washes = gallery[i].blueprint.washes || [];
          break;
        }
      }
    }

    Inkwell.addPointerEvents(canvasObj.canvas, {
      onDown: function(pos) { isDrawing = true; startPos = pos; currentPos = pos; },
      onMove: function(pos) { if (!isDrawing) return; currentPos = pos; drawPreview(); },
      onUp: function() { if (!isDrawing) return; isDrawing = false; commitWash(); startPos = null; currentPos = null; }
    });

    var sliderSoftness = document.getElementById('slider-softness'), sliderTransparency = document.getElementById('slider-transparency'), sliderGrain = document.getElementById('slider-grain');
    var valSoftness = document.getElementById('val-softness'), valTransparency = document.getElementById('val-transparency'), valGrain = document.getElementById('val-grain');
    sliderSoftness.addEventListener('input', function() { settings.softness = parseInt(this.value); valSoftness.textContent = this.value; });
    sliderTransparency.addEventListener('input', function() { settings.transparency = parseInt(this.value); valTransparency.textContent = this.value; });
    sliderGrain.addEventListener('input', function() { settings.grain = parseInt(this.value); valGrain.textContent = this.value; });

    var typeButtons = document.querySelectorAll('#wash-type .ink-swatch');
    for (var t = 0; t < typeButtons.length; t++) {
      typeButtons[t].addEventListener('click', function() {
        for (var j = 0; j < typeButtons.length; j++) typeButtons[j].classList.remove('active');
        this.classList.add('active'); settings.washType = this.getAttribute('data-type');
      });
    }

    var swatches = document.querySelectorAll('#palette .ink-swatch');
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].addEventListener('click', function() {
        for (var j = 0; j < swatches.length; j++) swatches[j].classList.remove('active');
        this.classList.add('active'); settings.color = this.getAttribute('data-color');
      });
    }

    document.getElementById('btn-save').addEventListener('click', function() { Inkwell.saveToGallery('gradient-weaver', canvasObj.offscreen, GW.getBlueprint()); });
    document.getElementById('btn-clear').addEventListener('click', function() { Inkwell.clearCanvas(canvasObj); washes = []; });
    loopId = Inkwell.startLoop(function() {}, function() {});
  };

  GW.getBlueprint = function() {
    var washData = [];
    for (var i = 0; i < washes.length && i < 30; i++) {
      var w = washes[i];
      washData.push({ x1: Math.round(w.x1), y1: Math.round(w.y1), x2: Math.round(w.x2), y2: Math.round(w.y2), color: w.color, softness: w.softness, transparency: w.transparency, grain: w.grain, washType: w.washType });
    }
    return { canvasWidth: canvasObj.width, canvasHeight: canvasObj.height, washes: washData };
  };

  GW.renderBlueprint = function(targetCanvas, blueprint) {
    var ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    if (!blueprint.washes || !blueprint.washes.length) return;
    var scaleX = targetCanvas.width / (blueprint.canvasWidth || targetCanvas.width);
    var scaleY = targetCanvas.height / (blueprint.canvasHeight || targetCanvas.height);
    for (var i = 0; i < blueprint.washes.length; i++) {
      var w = blueprint.washes[i];
      drawWash(ctx, w.x1 * scaleX, w.y1 * scaleY, w.x2 * scaleX, w.y2 * scaleY, { color: w.color, softness: w.softness, transparency: w.transparency, grain: w.grain, washType: w.washType });
    }
  };

  window.Inkwell.GradientWeaver = GW;
  document.addEventListener('DOMContentLoaded', function() { GW.init(); });
})();