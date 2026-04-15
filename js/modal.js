/**
 * modal.js - Focus-trapped modal system
 * Handles open/close, focus trapping, ARIA attributes, and ESC key.
 */

let lastFocusedElement = null;
let activeModal = null;

/**
 * Open a modal by ID
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Save current focus
  lastFocusedElement = document.activeElement;

  // Show modal
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus first focusable element
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length > 0) {
    focusable[0].focus();
  } else {
    modal.querySelector('.modal-content')?.focus();
  }

  // Set up focus trap
  activeModal = modal;
  document.addEventListener('keydown', handleModalKeydown);
}

/**
 * Close a modal by ID
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Hide modal
  modal.setAttribute('hidden', '');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // Return focus to trigger element
  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }

  // Remove focus trap
  if (activeModal === modal) {
    activeModal = null;
    document.removeEventListener('keydown', handleModalKeydown);
  }
}

/**
 * Handle keyboard events within modal
 */
function handleModalKeydown(event) {
  if (event.key === 'Escape') {
    if (activeModal) {
      closeModal(activeModal.id);
    }
    return;
  }

  if (event.key === 'Tab' && activeModal) {
    const focusable = activeModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Shift + Tab on first element -> wrap to last
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
    // Tab on last element -> wrap to first
    else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Initialize modal system
 */
export function init() {
  // Set up backdrop click handlers
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    const modal = backdrop.closest('.modal');
    if (modal) {
      backdrop.addEventListener('click', () => closeModal(modal.id));
    }
  });

  // Set up close button handlers
  document.querySelectorAll('.modal-close').forEach(btn => {
    const modal = btn.closest('.modal');
    if (modal) {
      btn.addEventListener('click', () => closeModal(modal.id));
    }
  });
}
