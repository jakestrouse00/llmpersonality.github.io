# Architecture Decision: LLMPersonality Website (Final)

## Selected Approach: Hybrid Vanilla Stack

**Rationale:** Zero external dependencies, sub-path compatible via `<base href="./">`, zero-FOUC theme preloader, design tokens prevent visual drift, automated guardrails catch regressions.

---

## File Structure

```
/
├── index.html          # Home – framework intro, loop phases visualization
├── agents.html         # Agent Explorer – interactive cards, filters, modals
├── about.html          # About the project, contributing
├── css/
│   ├── tokens.css      # Design tokens: CSS custom properties (~150 lines)
│   ├── reset.css       # Minimal reset
│   └── components.css  # All UI components using tokens
├── js/
│   ├── theme.js        # Theme toggle, versioned localStorage (theme_v1), contrast toggle
│   ├── modal.js        # Focus-trapped modal, ESC-to-close, ARIA attributes
│   ├── scroll-anim.js  # IntersectionObserver scroll-triggered reveal
│   ├── agents-data.js  # Agent profiles (6 agents, no Trace Analyst)
│   ├── agents-ui.js    # Filtering, card rendering, expand/collapse, modal wiring
│   ├── lint-guard.js   # Runtime CSS token usage checker (dev mode, console warnings)
│   ├── a11y-audit.js   # Runtime accessibility audit (modal focus, scroll-reveal)
│   └── main.js         # Page initialization, wires all modules + guardrails
├── ci/
│   └── run-guardrails.sh  # CI guardrail script
├── docs/
│   └── architecture-decision.md
└── package.json
```

---

## Sub-Path Aware Asset Resolution

**Solution:** `<base href="./">` tag in every HTML page `<head>`. All CSS/JS links use relative paths (`css/tokens.css`, `js/main.js`). This ensures the site works at any directory depth without JavaScript detection hacks.

```html
<base href="./">
```

---

## Zero-FOUC Theme Preloader

Inline `<script>` in `<head>` runs before any stylesheet:

```javascript
(function() {
  var storedTheme = localStorage.getItem('theme_v1');
  var storedContrast = localStorage.getItem('contrast_v1');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = (storedTheme === 'dark' || storedTheme === 'light') ? storedTheme : (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  if (storedContrast === 'high') {
    document.documentElement.setAttribute('data-contrast', 'high');
  }
})();
```

---

## Design Tokens (Finalized by Creative)

```css
:root {
  /* === Spacing === */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;
  --space-4xl: 6rem;

  /* === Typography === */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Consolas, monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;
  --text-4xl: 2.5rem;
  --text-5xl: 3rem;
  --font-normal: 400;
  --font-medium: 500;
  --font-bold: 700;
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* === Colors - Light Mode === */
  --color-bg: #ffffff;
  --color-bg-alt: #f8fafc;
  --color-text: #1e293b;
  --color-text-muted: #64748b;
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-primary-hc: #ff6b6b;
  --color-accent: #f59e0b;
  --color-accent-hover: #d97706;
  --color-border: #e2e8f0;
  --color-card: #ffffff;
  --color-card-hover: #f1f5f9;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* === Shadows === */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* === Border Radius === */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* === Transitions === */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  --transition-spring: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* === Dark Mode === */
[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-bg-alt: #1e293b;
  --color-text: #f1f5f9;
  --color-text-muted: #94a3b8;
  --color-primary: #818cf8;
  --color-primary-hover: #a5b4fc;
  --color-primary-hc: #ff8787;
  --color-accent: #fbbf24;
  --color-accent-hover: #f59e0b;
  --color-border: #334155;
  --color-card: #1e293b;
  --color-card-hover: #334155;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
}

/* === High Contrast Mode === */
[data-contrast="high"] {
  --color-primary: var(--color-primary-hc);
}
```
---

## Module Responsibilities

| Module | Responsibility |
|---|---|
| `theme.js` | Toggle `data-theme`/`data-contrast`, versioned localStorage, expose getters/setters |
| `modal.js` | Open/close by ID, focus trap, `aria-modal`, ESC key |
| `scroll-anim.js` | Observe `.reveal`, add `.visible` on intersection |
| `agents-data.js` | Export `AGENTS[]` with id, name, role, traits[], bio, exampleResponse |
| `agents-ui.js` | Filter buttons, render cards, expand/collapse, modal wiring |
| `lint-guard.js` | Scan stylesheets, warn on hard‑coded colors/spacing (dev mode) |
| `a11y-audit.js` | Check modal ARIA/focus, scroll‑reveal accessibility (dev mode) |
| `main.js` | Import all modules, dev‑mode detection, wire guardrails |

---

## Contrast Toggle Implementation

- Button with `id="contrast-toggle"` in nav
- `theme.js` exports `initContrastToggle()` that sets `data-contrast="high"` on `<html>` and persists `contrast_v1`.
- Integrated into `main.js`.

---

## Excluded Persona

**Trace Analyst** explicitly excluded per project scope.

---

## Constraints Satisfied

- [x] Multi-page (3 HTML pages, logically linked)
- [x] Shared CSS (3 stylesheets in `css/`)
- [x] Modular JS (8 modules in `js/`)
- [x] Zero external dependencies (no CDN, no build step)
- [x] Interactive Agent Explorer (filter, cards, expand, modal deep‑dive)
- [x] Dark/light mode with zero‑FOUC preloader
- [x] High‑contrast accessibility toggle
- [x] Scroll‑triggered animations
- [x] No Trace Analyst content
- [x] Design tokens prevent visual hierarchy drift
- [x] Sub‑path compatible via `<base href="./">`
- [x] Guardrails (lint‑guard.js, a11y‑audit.js) wired and running (dev mode)
```