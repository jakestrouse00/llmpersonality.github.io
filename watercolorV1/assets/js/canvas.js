/* ============================================
   AQUARELLE — Interactive Canvas
   Watercolor splash & ink trail effects
   ============================================ */

(function () {
  'use strict';

  var canvas = document.getElementById('paint-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var wrapper = canvas.parentElement;

  /* --- State --- */
  var currentColor = '106,154,176';
  var isDrawing = false;
  var hasMoved = false;
  var lastX = 0;
  var lastY = 0;
  var lastTime = 0;
  var clickStartPos = null;

  /* --- Canvas Setup --- */
  function resizeCanvas() {
    var rect = wrapper.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var width = rect.width;
    var height = Math.max(400, Math.min(600, window.innerHeight * 0.5));

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fill with paper color
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, width, height);
  }

  resizeCanvas();

  var resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 200);
  });

  /* --- Color Selection --- */
  var swatches = document.querySelectorAll('.color-swatch');

  swatches.forEach(function (swatch) {
    swatch.addEventListener('click', function () {
      swatches.forEach(function (s) { s.classList.remove('color-swatch--active'); });
      this.classList.add('color-swatch--active');
      currentColor = this.getAttribute('data-color');
    });
  });

  /* --- Clear Button --- */
  var clearBtn = document.getElementById('canvas-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      var dpr = window.devicePixelRatio || 1;
      var rect = wrapper.getBoundingClientRect();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  /* --- Utility: Canvas-relative coordinates --- */
  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  /* --- Watercolor Splash --- */
  function createSplash(x, y) {
    var numDroplets = 8 + Math.floor(Math.random() * 8);

    for (var i = 0; i < numDroplets; i++) {
      var angle = Math.random() * Math.PI * 2;
      var distance = Math.random() * 45;
      var dx = x + Math.cos(angle) * distance;
      var dy = y + Math.sin(angle) * distance;
      var radius = Math.max(3, Math.random() * 30 + 8);
      var opacity = Math.random() * 0.15 + 0.05;

      var gradient = ctx.createRadialGradient(dx, dy, 0, dx, dy, radius);
      gradient.addColorStop(0, 'rgba(' + currentColor + ',' + opacity + ')');
      gradient.addColorStop(0.4, 'rgba(' + currentColor + ',' + (opacity * 0.6) + ')');
      gradient.addColorStop(1, 'rgba(' + currentColor + ',0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(dx, dy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central bloom
    var bloomRadius = Math.max(5, Math.random() * 18 + 10);
    var bloomGradient = ctx.createRadialGradient(x, y, 0, x, y, bloomRadius);
    bloomGradient.addColorStop(0, 'rgba(' + currentColor + ',0.2)');
    bloomGradient.addColorStop(0.5, 'rgba(' + currentColor + ',0.08)');
    bloomGradient.addColorStop(1, 'rgba(' + currentColor + ',0)');

    ctx.fillStyle = bloomGradient;
    ctx.beginPath();
    ctx.arc(x, y, bloomRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /* --- Ink Trail --- */
  function drawTrailSegment(x, y) {
    var now = Date.now();
    var dt = Math.max(1, now - lastTime);
    var dx = x - lastX;
    var dy = y - lastY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = dist / dt;

    // Slower movement = thicker line (ink pools)
    var lineWidth = Math.max(1, Math.min(12, 10 - speed * 4));

    ctx.strokeStyle = 'rgba(' + currentColor + ',0.5)';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);

    // Smooth curve via midpoint
    var midX = (lastX + x) / 2;
    var midY = (lastY + y) / 2;
    ctx.quadraticCurveTo(lastX, lastY, midX, midY);
    ctx.stroke();

    // Ink bleed: random soft circles along the trail
    if (Math.random() < 0.35) {
      var bleedX = x + (Math.random() - 0.5) * lineWidth * 3;
      var bleedY = y + (Math.random() - 0.5) * lineWidth * 3;
      var bleedRadius = Math.max(2, Math.random() * lineWidth * 0.8);
      var bleedGradient = ctx.createRadialGradient(bleedX, bleedY, 0, bleedX, bleedY, bleedRadius);
      bleedGradient.addColorStop(0, 'rgba(' + currentColor + ',0.08)');
      bleedGradient.addColorStop(1, 'rgba(' + currentColor + ',0)');

      ctx.fillStyle = bleedGradient;
      ctx.beginPath();
      ctx.arc(bleedX, bleedY, bleedRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    lastX = x;
    lastY = y;
    lastTime = now;
  }

  /* --- Fade Animation Loop --- */
  function fadeLoop() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(250, 248, 245, 0.003)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    requestAnimationFrame(fadeLoop);
  }

  fadeLoop();

  /* --- Mouse Events --- */
  canvas.addEventListener('mousedown', function (e) {
    var pos = getPos(e);
    isDrawing = true;
    hasMoved = false;
    lastX = pos.x;
    lastY = pos.y;
    lastTime = Date.now();
    clickStartPos = { x: pos.x, y: pos.y };
  });

  canvas.addEventListener('mousemove', function (e) {
    if (!isDrawing) return;
    var pos = getPos(e);

    if (clickStartPos) {
      var dx = pos.x - clickStartPos.x;
      var dy = pos.y - clickStartPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        hasMoved = true;
      }
    }

    drawTrailSegment(pos.x, pos.y);
  });

  canvas.addEventListener('mouseup', function (e) {
    if (!isDrawing) return;
    var pos = getPos(e);

    // Always create a splash at the end point
    createSplash(pos.x, pos.y);

    isDrawing = false;
    clickStartPos = null;
  });

  canvas.addEventListener('mouseleave', function () {
    isDrawing = false;
    clickStartPos = null;
  });

  /* --- Touch Events --- */
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    var pos = getPos(e);
    isDrawing = true;
    hasMoved = false;
    lastX = pos.x;
    lastY = pos.y;
    lastTime = Date.now();
    clickStartPos = { x: pos.x, y: pos.y };
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (!isDrawing) return;
    var pos = getPos(e);

    if (clickStartPos) {
      var dx = pos.x - clickStartPos.x;
      var dy = pos.y - clickStartPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        hasMoved = true;
      }
    }

    drawTrailSegment(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    if (!isDrawing) return;

    if (e.changedTouches && e.changedTouches.length > 0) {
      var rect = canvas.getBoundingClientRect();
      var x = e.changedTouches[0].clientX - rect.left;
      var y = e.changedTouches[0].clientY - rect.top;
      createSplash(x, y);
    }

    isDrawing = false;
    clickStartPos = null;
  }, { passive: false });

})();
