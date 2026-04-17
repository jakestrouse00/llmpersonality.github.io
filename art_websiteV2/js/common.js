"use strict";

/**
 * Inkwell Atelier — Common Utilities
 * Shared navigation, paper-type toggle, procedural texture generation,
 * canvas helpers, and gallery (localStorage) utilities.
 */

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

const INKWELL_PAGES = [
  { href: 'index.html', label: 'Studio Hub', icon: '⬡' },
  { href: 'fluid-watercolor.html', label: 'Fluid Watercolor', icon: '💧' },
  { href: 'dynamic-ink.html', label: 'Dynamic Ink', icon: '✒' },
  { href: 'sumi-e-echo.html', label: 'Sumi-e Echo', icon: '◎' },
  { href: 'ephemeral-cartography.html', label: 'Cartography', icon: '🗺' },
  { href: 'kintsugi-fragments.html', label: 'Kintsugi', icon: '✦' },
  { href: 'gravity-ink.html', label: "Gravity's Ink", icon: '⇊' },
  { href: 'ink-wash-horizon.html', label: 'Ink-Wash Horizon', icon: '≋' },
  { href: 'gallery.html', label: 'Gallery', icon: '▦' }
];

function renderNav() {
  const nav = document.getElementById('inkwell-nav');
  if (!nav) return;

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  nav.innerHTML = '';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Inkwell Atelier Tools');

  const homeLink = document.createElement('a');
  homeLink.href = 'index.html';
  homeLink.className = 'nav-brand';
  homeLink.innerHTML = '<span class="brand-icon">⬡</span> The Inkwell Atelier';
  nav.appendChild(homeLink);

  const toolsWrap = document.createElement('div');
  toolsWrap.className = 'nav-tools';

  INKWELL_PAGES.forEach(page => {
    const link = document.createElement('a');
    link.href = page.href;
    link.className = 'nav-link';
    if (page.href === currentPage) {
      link.classList.add('nav-link--active');
      link.setAttribute('aria-current', 'page');
    }
    link.innerHTML = '<span class="nav-icon">' + page.icon + '</span> <span class="nav-label">' + page.label + '</span>';
    toolsWrap.appendChild(link);
  });

  nav.appendChild(toolsWrap);

  const paperToggle = document.createElement('div');
  paperToggle.className = 'paper-toggle';
  paperToggle.setAttribute('role', 'group');
  paperToggle.setAttribute('aria-label', 'Paper type selection');

  const paperTypes = [
    { id: 'washi', label: 'Rough Washi' },
    { id: 'vellum', label: 'Smooth Vellum' },
    { id: 'cotton', label: 'Absorbent Cotton' }
  ];

  const savedPaper = localStorage.getItem('inkwell-paper') || 'vellum';

  paperTypes.forEach(pt => {
    const btn = document.createElement('button');
    btn.className = 'paper-btn';
    if (pt.id === savedPaper) btn.classList.add('paper-btn--active');
    btn.textContent = pt.label;
    btn.dataset.paper = pt.id;
    btn.setAttribute('aria-pressed', pt.id === savedPaper ? 'true' : 'false');
    btn.addEventListener('click', () => setPaperType(pt.id));
    paperToggle.appendChild(btn);
  });

  nav.appendChild(paperToggle);
}

// ─── PAPER TYPE ──────────────────────────────────────────────────────────────

const PAPER_CONFIGS = {
  washi:  { absorption: 1.5, roughness: 0.8, grain: 0.6, cssClass: 'paper-washi' },
  vellum: { absorption: 1.0, roughness: 0.2, grain: 0.1, cssClass: 'paper-vellum' },
  cotton: { absorption: 2.0, roughness: 0.5, grain: 0.4, cssClass: 'paper-cotton' }
};

let currentPaper = localStorage.getItem('inkwell-paper') || 'vellum';

function getPaperConfig() {
  return PAPER_CONFIGS[currentPaper];
}

function setPaperType(paperId) {
  if (!PAPER_CONFIGS[paperId]) return;
  currentPaper = paperId;
  localStorage.setItem('inkwell-paper', paperId);

  document.body.className = document.body.className.replace(/paper-\w+/g, '').trim();
  document.body.classList.add(PAPER_CONFIGS[paperId].cssClass);

  document.querySelectorAll('.paper-btn').forEach(btn => {
    const isActive = btn.dataset.paper === paperId;
    btn.classList.toggle('paper-btn--active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  document.dispatchEvent(new CustomEvent('inkwell:paperChange', { detail: { paperId: paperId, config: PAPER_CONFIGS[paperId] } }));
}

// ─── PROCEDURAL TEXTURE GENERATION (Cheat-First) ─────────────────────────────

function generateInkBlot(size, color) {
  size = size || 128;
  color = color || '#1a1a2e';
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const cx = size / 2 + (Math.random() - 0.5) * size * 0.1;
  const cy = size / 2 + (Math.random() - 0.5) * size * 0.1;
  const maxR = size * 0.45 + Math.random() * size * 0.05;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0, color);
  grad.addColorStop(0.3, color + 'cc');
  grad.addColorStop(0.6, color + '66');
  grad.addColorStop(1, color + '00');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      const jitter = (Math.random() - 0.5) * 40;
      data[i + 3] = Math.max(0, Math.min(255, data[i + 3] + jitter));
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}

function generateInkBlotSet(count, size) {
  count = count || 6;
  size = size || 128;
  const colors = ['#1a1a2e', '#2d1b4e', '#1b3a4b', '#3d1c02', '#2e1a0e', '#0e2a1a'];
  const blots = [];
  for (let i = 0; i < count; i++) {
    blots.push(generateInkBlot(size, colors[i % colors.length]));
  }
  return blots;
}

function generatePaperTexture(type) {
  type = type || 'vellum';
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const baseColors = {
    washi:  { r: 235, g: 225, b: 205 },
    vellum: { r: 248, g: 244, b: 236 },
    cotton: { r: 240, g: 232, b: 220 }
  };

  const c = baseColors[type] || baseColors.vellum;
  ctx.fillStyle = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const grainAmount = PAPER_CONFIGS[type] ? PAPER_CONFIGS[type].grain : 0.2;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * grainAmount;
    data[i]     = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
}

// ─── CANVAS HELPERS ──────────────────────────────────────────────────────────

function createBufferCanvas(width, height) {
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  const bufferCtx = buffer.getContext('2d');
  return { buffer: buffer, bufferCtx: bufferCtx };
}

function initToolCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();

  const bufResult = createBufferCanvas(canvas.width, canvas.height);

  return { canvas: canvas, ctx: ctx, buffer: bufResult.buffer, bufferCtx: bufResult.bufferCtx, resize: resize };
}

function createRenderLoop(renderFn, targetFPS) {
  targetFPS = targetFPS || 60;
  const frameBudget = 1000 / targetFPS;
  let running = false;
  let rafId = null;
  let lastTime = 0;
  let qualityScale = 1.0;

  function loop(timestamp) {
    if (!running) return;

    const delta = timestamp - lastTime;
    lastTime = timestamp;

    if (delta > frameBudget * 1.5) {
      qualityScale = Math.max(0.25, qualityScale - 0.1);
    } else if (delta < frameBudget && qualityScale < 1.0) {
      qualityScale = Math.min(1.0, qualityScale + 0.05);
    }

    renderFn(delta, qualityScale);
    rafId = requestAnimationFrame(loop);
  }

  return {
    start: function() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    },
    stop: function() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    },
    getQualityScale: function() { return qualityScale; }
  };
}

// ─── GALLERY (localStorage) ─────────────────────────────────────────────────

const GALLERY_MAX_ITEMS = 20;
const GALLERY_KEY = 'inkwell-gallery';

function saveToGallery(canvasEl, toolName) {
  try {
    const maxW = 960;
    const maxH = 540;
    const scale = Math.min(maxW / canvasEl.width, maxH / canvasEl.height, 1);

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = Math.floor(canvasEl.width * scale);
    tmpCanvas.height = Math.floor(canvasEl.height * scale);
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.drawImage(canvasEl, 0, 0, tmpCanvas.width, tmpCanvas.height);

    const dataUrl = tmpCanvas.toDataURL('image/jpeg', 0.7);

    const gallery = loadGalleryMeta();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      tool: toolName,
      timestamp: Date.now(),
      data: dataUrl
    };

    while (gallery.length >= GALLERY_MAX_ITEMS) {
      gallery.shift();
    }

    gallery.push(entry);

    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    } catch (e) {
      while (gallery.length > 1) {
        gallery.shift();
        try {
          localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
          break;
        } catch (e2) { /* keep removing */ }
      }
    }

    return entry.id;
  } catch (err) {
    console.warn('Inkwell Gallery: save failed', err);
    return null;
  }
}

function loadGalleryMeta() {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function loadGallery() {
  return loadGalleryMeta();
}

function deleteFromGallery(entryId) {
  const gallery = loadGalleryMeta();
  const filtered = gallery.filter(function(e) { return e.id !== entryId; });
  localStorage.setItem(GALLERY_KEY, JSON.stringify(filtered));
}

function clearGallery() {
  localStorage.removeItem(GALLERY_KEY);
}

// ─── TOAST NOTIFICATION ────────────────────────────────────────────────────

function showToast(message, duration) {
  duration = duration || 2000;
  let toast = document.getElementById('ink-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ink-toast';
    toast.className = 'ink-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('ink-toast--visible');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function() {
    toast.classList.remove('ink-toast--visible');
  }, duration);
}

// ─── INK-STYLE UI ANIMATIONS ────────────────────────────────────────────────

function initScrollAnimations() {
  const elements = document.querySelectorAll('.ink-reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('ink-reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(function(el) { observer.observe(el); });
}

function initInkHoverEffects() {
  document.querySelectorAll('.ink-hover').forEach(function(el) {
    el.addEventListener('mouseenter', function() { el.classList.add('ink-hover--active'); });
    el.addEventListener('mouseleave', function() { el.classList.remove('ink-hover--active'); });
  });
}

// ─── INITIALIZATION ──────────────────────────────────────────────────────────

function initInkwell() {
  renderNav();
  setPaperType(currentPaper);
  initScrollAnimations();
  initInkHoverEffects();

  const paperTexture = generatePaperTexture(currentPaper);
  document.body.style.backgroundImage = 'url(' + paperTexture + ')';
  document.body.style.backgroundRepeat = 'repeat';

  document.addEventListener('inkwell:paperChange', function(e) {
    const newTexture = generatePaperTexture(e.detail.paperId);
    document.body.style.backgroundImage = 'url(' + newTexture + ')';
  });
}

document.addEventListener('DOMContentLoaded', initInkwell);