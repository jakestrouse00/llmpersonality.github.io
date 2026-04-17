(function() {
  'use strict';

  var DI = {};
  var canvasObj, particleSystem, loopId;
  var isDrawing = false;
  var lastPos = null;
  var lastTime = 0;
  var strokes = [];
  var currentStroke = null;
  var poolParticles = [];

  var MAX_POINTS_PER_STROKE = 100;

  var settings = {
    viscosity: 50,
    bristleSpread: 40,
    pooling: 30,
    color: '#0a0a0a'
  };

  // --- Velocity-to-Width Mapping ---
  function velocityToWidth(velocity) {
    var maxW = 4 + (settings.viscosity / 100) * 18;
    var minW = 0.8;
    var normalized = Inkwell.clamp(velocity / 800, 0, 1);
    var width = maxW - (maxW - minW) * normalized;
    return Math.max(minW, width);
  }

  // --- Draw a bristle-textured segment with path batching ---
  function drawBristleSegment(ctx, x1, y1, x2, y2, width, color, opacity) {
    var rgb = Inkwell.hexToRgb(color);
    var dx = x2 - x1;
    var dy = y2 - y1;
    var angle = Math.atan2(dy, dx);
    var perpX = Math.cos(angle + Math.PI / 2);
    var perpY = Math.sin(angle + Math.PI / 2);
    var spread = (settings.bristleSpread / 100) * width * 0.6;
    var bristleCount = Math.max(1, Math.floor(width / 1.5));

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();

    for (var b = 0; b < bristleCount; b++) {
      var offset = (b / (bristleCount - 1 || 1) - 0.5) * spread * 2;
      var jitter = (Math.random() - 0.5) * spread * 0.3;
      var bx1 = x1 + perpX * (offset + jitter);
      var by1 = y1 + perpY * (offset + jitter);
      var bx2 = x2 + perpX * (offset + jitter);
      var by2 = y2 + perpY * (offset + jitter);

      // Skip some bristles on high velocity for dry brush effect
      if (Math.random() < (1 - opacity) * 0.3) continue;

      ctx.moveTo(bx1, by1);
      ctx.lineTo(bx2, by2);
    }

    ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + opacity + ')';
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // --- Ink Pool Particle (end-of-stroke pooling) ---
  function PoolParticle(x, y, options) {
    options = options || {};
    this.x = x;
    this.y = y;
    this.size = options.startSize || 2;
    this.life = 1;
    this.maxLife = 1;
    this.color = options.color || '#0a0a0a';
    this.baseOpacity = options.opacity || 0.3;
    this.opacity = this.baseOpacity;
    this.decay = 0.012;
    this.growth = (settings.pooling / 100) * 0.4;
  }

  PoolParticle.prototype.update = function(dt) {
    this.life -= this.decay * dt;
    this.size += this.growth * dt;
    this.opacity = Math.max(0, (this.life / this.maxLife)) * this.baseOpacity;
  };

  PoolParticle.prototype.draw = function(ctx) {
    if (this.life <= 0 || this.opacity <= 0) return;
    var r = Math.max(0.5, this.size);
    var rgb = Inkwell.hexToRgb(this.color);
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',1)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  PoolParticle.prototype.isAlive = function() {
    return this.life > 0;
  };

  // --- Init ---
  DI.init = function() {
    var container = document.getElementById('canvas-container');
    canvasObj = Inkwell.createCanvas(container);
    particleSystem = new Inkwell.InkParticleSystem(300);

    Inkwell.addPointerEvents(canvasObj.canvas, {
      onDown: function(pos) {
        isDrawing = true;
        lastPos = pos;
        lastTime = performance.now();
        currentStroke = {
          color: settings.color,
          viscosity: settings.viscosity,
          bristleSpread: settings.bristleSpread,
          pooling: settings.pooling,
          points: [{ x: pos.x, y: pos.y, w: 4 }]
        };
      },
      onMove: function(pos) {
        if (!isDrawing || !lastPos) return;
        var now = performance.now();
        var dt = now - lastTime;
        var dist = Inkwell.distance(lastPos.x, lastPos.y, pos.x, pos.y);
        var velocity = dt > 0 ? dist / dt * 1000 : 0; // pixels per second
        var width = velocityToWidth(velocity);
        var opacity = Inkwell.clamp(1 - velocity / 1200, 0.15, 1);
        drawBristleSegment(canvasObj.ctx, lastPos.x, lastPos.y, pos.x, pos.y, width, settings.color, opacity);
        if (currentStroke) {
          currentStroke.points.push({ x: pos.x, y: pos.y, w: width, o: opacity });
        }
        lastPos = pos;
        lastTime = now;
      },
      onUp: function(pos) {
        if (!isDrawing) return;
        isDrawing = false;
        // Ink pooling at stroke end
        if (lastPos && settings.pooling > 10) {
          var poolCount = Math.floor(2 + (settings.pooling / 100) * 6);
          for (var i = 0; i < poolCount; i++) {
            var p = new PoolParticle(
              lastPos.x + (Math.random() - 0.5) * 8,
              lastPos.y + (Math.random() - 0.5) * 8,
              {
                color: settings.color,
                startSize: 2 + Math.random() * 3,
                opacity: 0.15 + Math.random() * 0.2
              }
            );
            particleSystem.addParticle(p);
          }
        }
        if (currentStroke && currentStroke.points.length > 1) {
          strokes.push(currentStroke);
        }
        currentStroke = null;
        lastPos = null;
      }
    });

    // Slider bindings
    var sliderViscosity = document.getElementById('slider-viscosity');
    var sliderBristle = document.getElementById('slider-bristle');
    var sliderPooling = document.getElementById('slider-pooling');
    var valViscosity = document.getElementById('val-viscosity');
    var valBristle = document.getElementById('val-bristle');
    var valPooling = document.getElementById('val-pooling');

    sliderViscosity.addEventListener('input', function() {
      settings.viscosity = parseInt(this.value);
      valViscosity.textContent = this.value;
    });
    sliderBristle.addEventListener('input', function() {
      settings.bristleSpread = parseInt(this.value);
      valBristle.textContent = this.value;
    });
    sliderPooling.addEventListener('input', function() {
      settings.pooling = parseInt(this.value);
      valPooling.textContent = this.value;
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
      var blueprint = DI.getBlueprint();
      Inkwell.saveToGallery('dynamic-ink', canvasObj.canvas, blueprint);
    });

    // Clear
    document.getElementById('btn-clear').addEventListener('click', function() {
      Inkwell.clearCanvas(canvasObj);
      particleSystem.particles = [];
      strokes = [];
    });

    // Render loop for pool particles
    loopId = Inkwell.startLoop(
      function(dt) { particleSystem.update(dt); },
      function() { particleSystem.draw(canvasObj.ctx); }
    );
  };

  // --- Get Blueprint (100-point cap per stroke) ---
  DI.getBlueprint = function() {
    var simplified = [];
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i];
      var step = Math.max(1, Math.floor(s.points.length / MAX_POINTS_PER_STROKE));
      var pts = [];
      for (var j = 0; j < s.points.length; j += step) {
        var p = s.points[j];
        pts.push({ x: Math.round(p.x), y: Math.round(p.y), w: +(p.w || 4).toFixed(1), o: +(p.o || 1).toFixed(2) });
      }
      // Ensure last point
      if (pts.length > 0 && s.points.length > 1) {
        var last = s.points[s.points.length - 1];
        var lastR = { x: Math.round(last.x), y: Math.round(last.y), w: +(last.w || 4).toFixed(1), o: +(last.o || 1).toFixed(2) };
        if (pts[pts.length - 1].x !== lastR.x || pts[pts.length - 1].y !== lastR.y) {
          pts.push(lastR);
        }
      }
      simplified.push({
        color: s.color,
        viscosity: s.viscosity,
        bristleSpread: s.bristleSpread,
        pooling: s.pooling,
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
  DI.renderBlueprint = function(targetCanvas, blueprint) {
    var ctx = targetCanvas.getContext('2d');
    var scaleX = targetCanvas.width / (blueprint.canvasWidth || targetCanvas.width);
    var scaleY = targetCanvas.height / (blueprint.canvasHeight || targetCanvas.height);

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    if (!blueprint.strokes || !blueprint.strokes.length) return;

    for (var i = 0; i < blueprint.strokes.length; i++) {
      var s = blueprint.strokes[i];
      var rgb = Inkwell.hexToRgb(s.color || '#0a0a0a');
      var spread = (s.bristleSpread || 40) / 100;

      for (var j = 1; j < s.points.length; j++) {
        var prev = s.points[j - 1];
        var curr = s.points[j];
        var px1 = prev.x * scaleX, py1 = prev.y * scaleY;
        var px2 = curr.x * scaleX, py2 = curr.y * scaleY;
        var w = (curr.w || 4) * scaleX;
        var o = curr.o || 1;

        var dx = px2 - px1;
        var dy = py2 - py1;
        var angle = Math.atan2(dy, dx);
        var perpX = Math.cos(angle + Math.PI / 2);
        var perpY = Math.sin(angle + Math.PI / 2);
        var bristleSpread = spread * w * 0.6;
        var bristleCount = Math.max(1, Math.floor(w / 1.5));

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        for (var b = 0; b < bristleCount; b++) {
          var offset = (b / (bristleCount - 1 || 1) - 0.5) * bristleSpread * 2;
          var bx1 = px1 + perpX * offset;
          var by1 = py1 + perpY * offset;
          var bx2 = px2 + perpX * offset;
          var by2 = py2 + perpY * offset;
          var bo = o * (0.6 + Math.random() * 0.4);
          ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + bo + ')';
          ctx.lineWidth = 0.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(bx1, by1);
          ctx.lineTo(bx2, by2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  };

  window.Inkwell.DynamicInk = DI;

  document.addEventListener('DOMContentLoaded', function() {
    DI.init();
  });

})();
