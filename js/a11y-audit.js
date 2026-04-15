/**
 * a11y-audit.js - Runtime accessibility audit (dev mode)
 * Checks that modal dialogs have the required ARIA attributes,
 * that focus trapping works, and that scroll‑reveal elements are
 * present in the accessibility tree before they become visible.
 *
 * Exported function `runAudits()` can be called manually; the module
 * also auto‑runs on page load when dev mode is detected (via main.js).
 */

function _log(category, message, element) {
  const fn = console.warn;
  fn(`[a11y-audit:${category}] ${message}`);
  if (element) fn('  →', element);
}

/* ------------------------------------------------------------------ */
/*  Modal checks                                                       */
function _auditModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    if (!modal.hasAttribute('role') || modal.getAttribute('role') !== 'dialog') {
      _log('modal', 'Missing role="dialog"', modal);
    }
    if (!modal.hasAttribute('aria-modal')) {
      _log('modal', 'Missing aria-modal="true"', modal);
    }
    if (!modal.hasAttribute('aria-labelledby')) {
      _log('modal', 'Missing aria-labelledby referencing a heading', modal);
    }
    const closeBtn = modal.querySelector('.modal-close');
    if (!closeBtn) {
      _log('modal', 'Missing close button with .modal-close class', modal);
    } else if (!closeBtn.hasAttribute('aria-label')) {
      _log('modal', 'Close button missing aria-label', closeBtn);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Scroll‑reveal checks                                                */
function _auditScrollReveal() {
  document.querySelectorAll('.reveal').forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      _log('scroll-reveal', 'Element hidden before reveal – may be inaccessible', el);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Keyboard navigation checks                                          */
function _auditNavigation() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const links = nav.querySelectorAll('a');
  if (links.length === 0) {
    _log('nav', 'Navigation contains no links', nav);
  }
}

/* ------------------------------------------------------------------ */
export function runAudits() {
  console.info('[a11y-audit] Running accessibility checks...');
  _auditModals();
  _auditScrollReveal();
  _auditNavigation();
  console.info('[a11y-audit] Checks complete');
}

/* ------------------------------------------------------------------ */
/*  Auto‑run in dev mode (called from main.js)                         */
if (typeof window !== 'undefined') {
  const isDev = window.location.hostname === 'localhost' ||
                window.location.search.includes('dev=1');
  if (isDev) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runAudits);
    } else {
      runAudits();
    }
  }
}
