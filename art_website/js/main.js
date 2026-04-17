(function() {
  'use strict';

  /* ============================================================
     THE INKWELL ATELIER — Shared Core Module
     ============================================================ */

  var Inkwell = {};

  // --- Constants ---
  var GALLERY_KEY = 'inkwell_gallery';
  var GALLERY_LIMIT = 20;
  var MAX_PARTICLES = 300;

  // --- InkParticle Class ---
  Inkwell.InkParticle = function(x, y, options) {
    options = options || {};
    this.x = x;
    this.y = y;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.size = options.size || 4;
    this.life = options.life || 1;
    this.maxLife = this.life;
    this.color = options.color || '#1a1a2e';
    this.baseOpacity = options.opacity !== undefined ? options.opacity : 1;
    this.opacity = this.baseOpacity;
    this.decay = options.decay || 0.008;
    this.growth = options.growth || 0;
    this.friction = options.friction || 0.98;
    this.gravity = options.gravity || 0;
  };

  Inkwell.InkParticle.prototype.update = function(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.life -= this.decay * dt;
    this.size += this.growth * dt;
    this.opacity = Math.max(0, (this.life / this.maxLife)) * this.baseOpacity;
  };

  Inkwell.InkParticle.prototype.draw = function(ctx) {
    if (this.life <= 0 || this.opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  Inkwell.InkParticle.prototype.isAlive = function() {
    return this.life > 0 && this.size > 0;
  };

  // --- InkParticleSystem Class (300-particle hard cap) ---
  Inkwell.InkParticleSystem = function(maxParticles) {
    this.particles = [];
    this.maxParticles = maxParticles || MAX_PARTICLES;
  };

  Inkwell.InkParticleSystem.prototype.addParticle = function(particle) {
    if (this.particles.length >= this.maxParticles) return false;
    this.particles.push(particle);
    return true;
  };

  Inkwell.InkParticleSystem.prototype.update = function(dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].isAlive()) {
        this.particles.splice(i, 1);
      }
    }
  };

  Inkwell.InkParticleSystem.prototype.draw = function(ctx) {
    for (var i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  };

  Object.defineProperty(Inkwell.InkParticleSystem.prototype, 'count', {
    get: function() { return this.particles.length; }
  });

  // --- Canvas Creation & Management ---
  Inkwell.createCanvas = function(container, options) {
    options = options || {};
    var canvas = document.createElement('canvas');
    var w = options.width || container.clientWidth;
    var h = options.height || container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    var offCtx = offscreen.getContext('2d');

    var canvasObj = {
      canvas: canvas,
      ctx: ctx,
      offscreen: offscreen,
      offCtx: offCtx,
      container: container,
      width: w,
      height: h
    };

    // Auto-resize on window resize
    var resizeHandler = Inkwell.throttle(function() {
      Inkwell.resizeCanvas(canvasObj);
    }, 150);
    window.addEventListener('resize', resizeHandler);
    canvasObj._resizeHandler = resizeHandler;

    return canvasObj;
  };

  Inkwell.resizeCanvas = function(canvasObj) {
    var container = canvasObj.container;
    canvasObj.canvas.width = container.clientWidth;
    canvasObj.canvas.height = container.clientHeight;
    canvasObj.offscreen.width = container.clientWidth;
    canvasObj.offscreen.height = container.clientHeight;
    canvasObj.width = container.clientWidth;
    canvasObj.height = container.clientHeight;
  };

  Inkwell.clearCanvas = function(canvasObj) {
    canvasObj.ctx.clearRect(0, 0, canvasObj.canvas.width, canvasObj.canvas.height);
    canvasObj.offCtx.clearRect(0, 0, canvasObj.offscreen.width, canvasObj.offscreen.height);
  };

  // --- Animation Loop Manager ---
  var loopCounter = 0;
  var activeLoops = {};

  Inkwell.startLoop = function(updateFn, drawFn) {
    var id = ++loopCounter;
    var lastTime = performance.now();

    function tick(now) {
      if (!activeLoops[id]) return;
      var dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;
      updateFn(dt);
      drawFn();
      activeLoops[id] = requestAnimationFrame(tick);
    }

    activeLoops[id] = requestAnimationFrame(tick);
    return id;
  };

  Inkwell.stopLoop = function(id) {
    if (activeLoops[id]) {
      cancelAnimationFrame(activeLoops[id]);
      delete activeLoops[id];
    }
  };

  // --- Pointer Events Utility ---
  Inkwell.getPointerPos = function(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var clientX, clientY;
    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  Inkwell.addPointerEvents = function(canvas, handlers) {
    var onDown = handlers.onDown || function(){};
    var onMove = handlers.onMove || function(){};
    var onUp = handlers.onUp || function(){};

    canvas.addEventListener('mousedown', function(e) {
      onDown(Inkwell.getPointerPos(canvas, e), e);
    });
    canvas.addEventListener('mousemove', function(e) {
      onMove(Inkwell.getPointerPos(canvas, e), e);
    });
    canvas.addEventListener('mouseup', function(e) {
      onUp(Inkwell.getPointerPos(canvas, e), e);
    });
    canvas.addEventListener('mouseleave', function(e) {
      onUp(Inkwell.getPointerPos(canvas, e), e);
    });

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      onDown(Inkwell.getPointerPos(canvas, e), e);
    }, { passive: false });
    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      onMove(Inkwell.getPointerPos(canvas, e), e);
    }, { passive: false });
    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      onUp(Inkwell.getPointerPos(canvas, e), e);
    }, { passive: false });
  };

  // --- Gallery: Save / Load / Delete ---
  Inkwell.GALLERY_LIMIT = GALLERY_LIMIT;

  Inkwell.saveToGallery = function(toolName, canvasEl, blueprint) {
    var gallery = Inkwell.loadGallery();

    // Generate 100x75 thumbnail
    var thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 100;
    thumbCanvas.height = 75;
    var thumbCtx = thumbCanvas.getContext('2d');
    thumbCtx.drawImage(canvasEl, 0, 0, 100, 75);
    var thumbnail = thumbCanvas.toDataURL('image/png');

    var item = {
      id: Inkwell.generateId(),
      tool: toolName,
      timestamp: Date.now(),
      label: '',
      thumbnail: thumbnail,
      blueprint: blueprint || {}
    };

    gallery.push(item);

    // FIFO eviction
    while (gallery.length > GALLERY_LIMIT) {
      gallery.shift();
    }

    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
      Inkwell.showToast('Saved to gallery');
      return true;
    } catch (e) {
      Inkwell.showToast('Save failed — storage full');
      return false;
    }
  };

  Inkwell.loadGallery = function() {
    try {
      var data = localStorage.getItem(GALLERY_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  };

  Inkwell.deleteFromGallery = function(id) {
    var gallery = Inkwell.loadGallery();
    var filtered = gallery.filter(function(item) {
      return item.id !== id;
    });
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(filtered));
    } catch (e) {}
  };

  Inkwell.renameInGallery = function(id, newLabel) {
    var gallery = Inkwell.loadGallery();
    for (var i = 0; i < gallery.length; i++) {
      if (gallery[i].id === id) {
        gallery[i].label = newLabel;
        break;
      }
    }
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    } catch (e) {}
  };

  // --- Sidebar Initialization ---
  Inkwell.initSidebar = function(activeTool) {
    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('data-tool') === activeTool) {
        links[i].classList.add('nav-active');
      }
    }
  };

  // --- Scroll-Triggered Animations ---
  Inkwell.initScrollAnimations = function() {
    var targets = document.querySelectorAll('.fade-in');
    if (!targets.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('visible');
            observer.unobserve(entries[i].target);
          }
        }
      }, { threshold: 0.1 });

      for (var i = 0; i < targets.length; i++) {
        observer.observe(targets[i]);
      }
    } else {
      // Fallback: show all immediately
      for (var i = 0; i < targets.length; i++) {
        targets[i].classList.add('visible');
      }
    }
  };

  // --- Toast Notifications ---
  Inkwell.showToast = function(message, duration) {
    duration = duration || 2200;
    var toast = document.createElement('div');
    toast.className = 'ink-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      toast.classList.add('show');
    });
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  };

  // --- Utility Functions ---
  Inkwell.hexToRgb = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  };

  Inkwell.rgbToHex = function(r, g, b) {
    return '#' + [r, g, b].map(function(x) {
      var h = Math.round(Inkwell.clamp(x, 0, 255)).toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  };

  Inkwell.lerpColor = function(c1, c2, t) {
    var r1 = Inkwell.hexToRgb(c1);
    var r2 = Inkwell.hexToRgb(c2);
    var r = Math.round(r1.r + (r2.r - r1.r) * t);
    var g = Math.round(r1.g + (r2.g - r1.g) * t);
    var b = Math.round(r1.b + (r2.b - r1.b) * t);
    return Inkwell.rgbToHex(r, g, b);
  };

  Inkwell.throttle = function(fn, ms) {
    var lastCall = 0;
    return function() {
      var now = Date.now();
      var args = arguments;
      var context = this;
      if (now - lastCall >= ms) {
        lastCall = now;
        fn.apply(context, args);
      }
    };
  };

  Inkwell.debounce = function(fn, ms) {
    var timer;
    return function() {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(context, args);
      }, ms);
    };
  };

  Inkwell.clamp = function(val, min, max) {
    return Math.min(Math.max(val, min), max);
  };

  Inkwell.randomRange = function(min, max) {
    return min + Math.random() * (max - min);
  };

  Inkwell.seededRandom = function(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  };

  Inkwell.generateId = function() {
    return Math.random().toString(16).slice(2, 8);
  };

  Inkwell.distance = function(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // --- Auto-initialization on DOMContentLoaded ---
  document.addEventListener('DOMContentLoaded', function() {
    var activeTool = document.body.getAttribute('data-tool');
    if (activeTool) {
      Inkwell.initSidebar(activeTool);
    }
    Inkwell.initScrollAnimations();
  });

  // --- Export ---
  window.Inkwell = Inkwell;

})();
