/**
 * theme.js - Theme and contrast toggle management
 * Handles dark/light mode persistence (theme_v1) and high‑contrast mode
 * (contrast_v1). Provides UI updates for the two toggle buttons.
 */

const THEME_KEY = 'theme_v1';
const CONTRAST_KEY = 'contrast_v1';

/* ------------------------------------------------------------------ */
/*  Public API – getters / setters                                      */
/* ------------------------------------------------------------------ */
export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  _updateThemeToggleUI(theme);
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function getContrast() {
  return document.documentElement.getAttribute('data-contrast') || 'normal';
}

export function setContrast(mode) {
  if (mode !== 'normal' && mode !== 'high') return;
  document.documentElement.setAttribute('data-contrast', mode);
  localStorage.setItem(CONTRAST_KEY, mode);
  _updateContrastToggleUI(mode);
}

export function toggleContrast() {
  setContrast(getContrast() === 'high' ? 'normal' : 'high');
}

/* ------------------------------------------------------------------ */
/*  UI helpers – keep toggle buttons in sync with state                */
/* ------------------------------------------------------------------ */
function _updateThemeToggleUI(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const icon = btn.querySelector('.toggle-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  btn.setAttribute('aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

function _updateContrastToggleUI(mode) {
  const btn = document.getElementById('contrast-toggle');
  if (!btn) return;
  btn.classList.toggle('active', mode === 'high');
  btn.setAttribute('aria-label',
    mode === 'high' ? 'Disable high contrast' : 'Enable high contrast');
}

/* ------------------------------------------------------------------ */
/*  Initialization – wire button events and apply persisted settings     */
/* ------------------------------------------------------------------ */
export function init() {
  // Apply persisted values (in case the preloader was bypassed)
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    setTheme(storedTheme);
  }

  const storedContrast = localStorage.getItem(CONTRAST_KEY);
  if (storedContrast === 'high') {
    setContrast('high');
  }

  // Theme toggle button
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
    // Ensure UI reflects current state on load
    _updateThemeToggleUI(getTheme());
  }

  // Contrast toggle button
  const contrastBtn = document.getElementById('contrast-toggle');
  if (contrastBtn) {
    contrastBtn.addEventListener('click', toggleContrast);
    _updateContrastToggleUI(getContrast());
  }
}
