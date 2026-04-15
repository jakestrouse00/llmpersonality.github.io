/**
 * scroll-anim.js - IntersectionObserver scroll-triggered reveal animations
 * Adds .visible class to elements with .reveal class when they enter the viewport.
 */

const SCROLL_ANIM_CONFIG = {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px'
};

let scrollObserver = null;

/**
 * Initialize scroll-triggered reveal animations
 */
export function init() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: show all elements immediately
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('visible');
    });
    return;
  }

  // Disconnect existing observer
  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  scrollObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, SCROLL_ANIM_CONFIG);

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    scrollObserver.observe(el);
  });
}

/**
 * Refresh observer (call after dynamic content is added)
 * Re-initializes the observer to pick up new .reveal elements.
 */
export function refresh() {
  init();
}

// Alias for compatibility
export { init as initScrollAnim };
