/**
 * main.js - Page initialization and module wiring
 * Imports all modules and runs initialization on DOMContentLoaded.
 */

// Core modules
import { init as initTheme } from './theme.js';
import { init as initScrollAnim } from './scroll-anim.js';
import { init as initAgentsUI } from './agents-ui.js';
import { init as initModal } from './modal.js';

/**
 * Dev-mode detection
 * Guardrail modules are loaded only in development environments.
 * Set window.LLMP_DEV = true to force dev mode, or use ?dev=1 query param.
 */
function isDevMode() {
  // Manual override
  if (window.LLMP_DEV === true) return true;
  // Query param
  if (window.location.search.includes('dev=1')) return true;
  // Known local hostnames
  const localHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
  if (localHosts.includes(window.location.hostname)) return true;
  // Non‑public hostname (no dot) – e.g., Docker, LAN names
  if (window.location.hostname && !window.location.hostname.includes('.')) return true;
  return false;
}

// Guardrail modules (dev mode only, with error handling)
if (isDevMode()) {
  const loadGuardrail = async (modulePath, name) => {
    try {
      await import(modulePath);
    } catch (err) {
      console.error(`[guardrail] Failed to load ${name}:`, err.message);
    }
  };
  loadGuardrail('./lint-guard.js', 'lint-guard');
  loadGuardrail('./a11y-audit.js', 'a11y-audit');
}

/**
 * Initialize all interactive components
 */
function init() {
  // Modal system
  initModal();
  
  // Theme and contrast toggles
  initTheme();
  
  // Scroll‑triggered animations
  initScrollAnim();
  
  // Agent Explorer (only on agents page)
  if (document.getElementById('agents-grid')) {
    initAgentsUI();
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for potential external use
export { init };
