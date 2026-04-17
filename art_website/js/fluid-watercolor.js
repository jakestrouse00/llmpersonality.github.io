(function() {
  'use strict';

  var FW = {};
  var canvasObj, particleSystem, loopId;
  var isDrawing = false;
  var lastPos = null;
  var strokes = [];
  var currentStroke = null;
  var gradientCache = {};

  var settings = {
    intensity: 50,
    wetness: 60,
    bleedRate: 40,
    color: '#1a1a2e'
  };

  var MAX_POINTS_PER_STROKE = 100;

  // --- Gradient Cache ---
  // Pre-render radial gradient blobs for each color at several size tiers.
  // This replaces per-frame createRadialGradient calls with fast drawImage stamps.
  function buildGradientCache() {
    var colors = ['#1a1a2e','#8b1a1a','#c17f59','#2d5a3d','#3a4a7a','#6b3a5a','#4a4a4a','#8b7355'];
    var sizeTiers = [8, 16, 24, 36, 52, 72];
    gradientCache = {};

    for (var c = 0; c < colors.length; c++) {
      var hex = colors[c];
      var rgb = Inkwell.hexToRgb(hex);
      gradientCache[hex] = {};

      for (var s = 0; s < sizeTiers.length; s++) {
        var radius = sizeTiers[s];
        var dim = radius * 2;
        var offC = document.createElement('canvas');
        offC.width = dim;
        offC.height = dim;
        var offCtx = offC.getContext('2d');

        var grad = offCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        var inner = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.6)';
        var mid = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.25)';
        var outer = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)';
        grad.addColorStop(0, inner);
        grad.addColorStop(0.5, mid);
        grad.addColorStop(1, outer);

        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, dim, dim);
        gradientCache[hex][radius] = offC;
      }
    }
  }

  function getNearestCachedSize(desiredSize) {
    var tiers = [8, 16, 24, 36, 52, 72];
    var best = tiers[0];
    for (var i = 0; i < tiers.length; i++) {
      if (Math.abs(tiers[i] - desiredSize) < Math.abs(best - desiredSize)) {
        best = tiers[i];
      }
    }
    return best;
  }

  // Simple noise for organic bloom warping
  function simpleNoise(x, y, seed) {
    var n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.758) * 43758.5453;
    return n - Math.floor(n);
  }

  // --- Bloom Particle ---
  function BloomParticle(x, y, options) {
    options = options || {};
    var noiseVal = simpleNoise(x * 0.01, y * 0.01, Math.random() * 1000);
    var angle = noiseVal * Math.PI * 2;
    var drift = (options.wetness || 60) / 100 * 0.8;

    this.x = x + Math.cos(angle) * drift * 3;
    this.y = y + Math.sin(angle) * drift * 3;
    this.vx = Math.cos(angle) * drift * 0.3;
    this.vy = Math.sin(angle) * drift * 0.3;
    this.size = options.startSize || 2;
    this.life = 1;
    this.maxLife = 1;
    this.color = options.color || '#1a1a2e';
    this.baseOpacity = options.opacity !== undefined ? options.opacity : 0.35;
    this.opacity = this.baseOpacity;
    this.decay = 0.003 + (1 - (options.wetness || 60) / 100) * 0.008;
    this.growth = (options.intensity || 50) / 100 * 0.6;
    this.friction = 0.96;
    this.gravity = 0.01;
    this.bleedRate = (options.bleedRate || 40) / 100;
    this.seed = Math.random() * 1000;
  }

  BloomParticle.prototype.update = function(dt) {
    var noiseVal = simpleNoise(this.x * 0.005, this.y * 0.005, this.seed);
    var driftAngle = noiseVal * Math.PI * 2;
    this.vx += Math.cos(driftAngle) * this.bleedRate * 0.02 * dt;
    this.vy += Math.sin(driftAngle) * this.bleedRate * 0.02 * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.life -= this.decay * dt;
    this.size += this.growth * dt;
    this.opacity = Math.max(0, (this.life / this.maxLife)) * this.baseOpacity;
  };

  BloomParticle.prototype.draw = function(ctx) {
    if (this.life <= 0 || this.opacity <= 0) return;
    var r = Math.max(0.5, this.size);
    var cached = gradientCache[this.color];
    if (!cached) return;
    var nearestSize = getNearestCachedSize(r);
    var stamp = cached[nearestSize];
    if (!stamp) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.globalCompositeOperation = 'multiply';
    var drawSize = r * 2;
    ctx.drawImage(stamp, this.x - r, this.y - r, drawSize, drawSize);
    ctx.restore();
  };

  BloomParticle.prototype.isAlive = function() {
    return this.life > 0 && this.size > 0;
  };

  // --- Spawn bloom at position ---
  function spawnBloom(x, y) {
    var count = Math.floor(3 + (settings.intensity / 100) * 8);
    for (var i = 0; i < count; i++) {
      var p = new BloomParticle(x, y, {
        color: settings.color,
        intensity: settings.intensity,
        wetness: settings.wetness,
        bleedRate: settings.bleedRate,
        startSize: 1 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.25
      });
      if (!particleSystem.addParticle(p)) break;
    }
  }

  // --- Spawn along drag path ---
  function spawnAlongPath(fromX, fromY, toX, toY) {
    var dist = Inkwell.distance(fromX, fromY, toX, toY);
    var steps = Math.max(1, Math.floor(dist / 8));
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = fromX + (toX - fromX) * t;
      var y = fromY + (toY - fromY) * t;
      spawnBloom(x, y);
    }
  }

  // --- Init ---
  FW.init = function() {
    buildGradientCache();

    var container = document.getElementById('canvas-container');
    canvasObj = Inkwell.createCanvas(container);
    particleSystem = new Inkwell.InkParticleSystem(300);

    Inkwell.addPointerEvents(canvasObj.canvas, {
      onDown: function(pos) {
        isDrawing = true;
        lastPos = pos;
        spawnBloom(pos.x, pos.y);
        currentStroke = { color: settings.color, points: [{ x: pos.x, y: pos.y }] };
      },
      onMove: function(pos) {
        if (!isDrawing) return;
        if (lastPos) {
          spawnAlongPath(lastPos.x, lastPos.y, pos.x, pos.y);
        }
        lastPos = pos;
        if (currentStroke) {
          currentStroke.points.push({ x: pos.x, y: pos.y });
        }
      },
      onUp: function() {
        isDrawing = false;
        lastPos = null;
        if (currentStroke && currentStroke.points.length > 0) {
          strokes.push({
            color: currentStroke.color,
            intensity: settings.intensity,
            wetness: settings.wetness,
            bleedRate: settings.bleedRate,
            points: currentStroke.points
          });
        }
        currentStroke = null;
      }
    });

    // Slider bindings
    var sliderIntensity = document.getElementById('slider-intensity');
    var sliderWetness = document.getElementById('slider-wetness');
    var sliderBleed = document.getElementById('slider-bleed');
    var valIntensity = document.getElementById('val-intensity');
    var valWetness = document.getElementById('val-wetness');
    var valBleed = document.getElementById('val-bleed');

    sliderIntensity.addEventListener('input', function() {
      settings.intensity = parseInt(this.value);
      valIntensity.textContent = this.value;
    });
    sliderWetness.addEventListener('input', function() {
      settings.wetness = parseInt(this.value);
      valWetness.textContent = this.value;
    });
    sliderBleed.addEventListener('input', function() {
      settings.bleedRate = parseInt(this.value);
      valBleed.textContent = this.value;
    });

    // Palette
    var swatches = document.querySelectorAll('#palette .ink-swatch');
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].addEventListener('click', function() {
        for (var j = 0; j < swatches.length; j++) {
          swatches[j].classList.remove('active');
        }
        this.classList.add('active');
        settings.color = this.getAttribute('data-color');
      });
    }

    // Save
    document.getElementById('btn-save').addEventListener('click', function() {
      var blueprint = FW.getBlueprint();
      Inkwell.saveToGallery('fluid-watercolor', canvasObj.canvas, blueprint);
    });

    // Clear
    document.getElementById('btn-clear').addEventListener('click', function() {
      Inkwell.clearCanvas(canvasObj);
      particleSystem.particles = [];
      strokes = [];
    });

    // Render loop
    loopId = Inkwell.startLoop(
      function(dt) { particleSystem.update(dt); },
      function() { particleSystem.draw(canvasObj.ctx); }
    );
  };

  // --- Get Blueprint (100-point cap per stroke) ---
  FW.getBlueprint = function() {
    var simplified = [];
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i];
      var step = Math.max(1, Math.floor(s.points.length / MAX_POINTS_PER_STROKE));
      var pts = [];
      for (var j = 0; j < s.points.length; j += step) {
        pts.push({ x: Math.round(s.points[j].x), y: Math.round(s.points[j].y) });
      }
      // Ensure last point
      if (pts.length > 0 && s.points.length > 1) {
        var last = s.points[s.points.length - 1];
        var lastRounded = { x: Math.round(last.x), y: Math.round(last.y) };
        if (pts[pts.length - 1].x !== lastRounded.x || pts[pts.length - 1].y !== lastRounded.y) {
          pts.push(lastRounded);
        }
      }
      simplified.push({
        color: s.color,
        intensity: s.intensity,
        wetness: s.wetness,
        bleedRate: s.bleedRate,
        points: pts.slice(0, MAX_POINTS_PER_STROKE)
      });
    }
    return {
      canvasWidth: canvasObj.width,
      canvasHeight: canvasObj.height,
      strokes: simplified
    };
  };

  // --- Render Blueprint (for Gallery remix) ---
  FW.renderBlueprint = function(targetCanvas, blueprint) {
    var ctx = targetCanvas.getContext('2d');
    var scaleX = targetCanvas.width / (blueprint.canvasWidth || targetCanvas.width);
    var scaleY = targetCanvas.height / (blueprint.canvasHeight || targetCanvas.height);

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    if (!blueprint.strokes || !blueprint.strokes.length) return;

    for (var i = 0; i < blueprint.strokes.length; i++) {
      var s = blueprint.strokes[i];
      var rgb = Inkwell.hexToRgb(s.color || '#1a1a2e');
      var intensity = (s.intensity || 50) / 100;

      for (var j = 0; j < s.points.length; j++) {
        var px = s.points[j].x * scaleX;
        var py = s.points[j].y * scaleY;
        var radius = 8 + intensity * 20;

        ctx.save();
        ctx.globalAlpha = 0.2 + intensity * 0.15;
        ctx.globalCompositeOperation = 'multiply';
        var grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        var inner = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.5)';
        var outer = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)';
        grad.addColorStop(0, inner);
        grad.addColorStop(0.6, inner);
        grad.addColorStop(1, outer);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  };

  window.Inkwell.FluidWatercolor = FW;

  document.addEventListener('DOMContentLoaded', function() {
    FW.init();
  });

})();
