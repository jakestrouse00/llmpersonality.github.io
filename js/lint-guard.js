/**
 * lint-guard.js - Runtime CSS token usage checker (dev mode)
 * Scans all loaded stylesheets and warns if a color or spacing value
 * is hard‑coded instead of using a CSS custom property (var(--…)).
 *
 * The module exports a single function `runLintCheck()` that can be
 * invoked manually or via the dev‑mode import in `js/main.js`.
 */

const TOKEN_PATTERNS = {
  color: /#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(/,
  spacing: /\b(\d+\.?\d*)(px|rem|em|%)/,
};

const IGNORED_SELECTORS = [
  '.sr-only',
  '[hidden]',
  '::-webkit-scrollbar',
  '::selection',
];

/* ------------------------------------------------------------------ */
function _shouldIgnore(selector) {
  return IGNORED_SELECTORS.some(ign => selector.includes(ign));
}

/* ------------------------------------------------------------------ */
function _scanStylesheet(sheet) {
  const warnings = [];

  try {
    const rules = sheet.cssRules || sheet.rules;
    if (!rules) return warnings;

    for (const rule of rules) {
      if (rule.type !== CSSRule.STYLE_RULE) continue;
      const selector = rule.selectorText || '';
      if (_shouldIgnore(selector)) continue;

      const style = rule.style;
      for (let i = 0; i < style.length; i++) {
        const prop = style[i];
        const value = style.getPropertyValue(prop);

        // Colour‑related properties
        if (/(color|background|border|outline)/i.test(prop)) {
          if (TOKEN_PATTERNS.color.test(value) && !value.includes('var(')) {
            warnings.push({
              selector,
              property: prop,
              value,
              message: `Hard‑coded colour "${value}" – use a var(--color-*) token`,
            });
          }
        }

        // Spacing‑related properties
        if (/(margin|padding|gap)/i.test(prop)) {
          if (TOKEN_PATTERNS.spacing.test(value) && !value.includes('var(')) {
            warnings.push({
              selector,
              property: prop,
              value,
              message: `Hard‑coded spacing "${value}" – use a var(--space-*) token`,
            });
          }
        }
      }
    }
  } catch (e) {
    // Cross‑origin stylesheet may throw; ignore safely.
  }

  return warnings;
}

/* ------------------------------------------------------------------ */
export function runLintCheck() {
  const allWarnings = [];

  document.styleSheets.forEach(sheet => {
    allWarnings.push(..._scanStylesheet(sheet));
  });

  if (allWarnings.length > 0) {
    console.group('[lint-guard] CSS token violations detected');
    allWarnings.forEach(w => {
      console.warn(`${w.selector} { ${w.property}: ${w.value}; }`);
      console.warn(`  → ${w.message}`);
    });
    console.groupEnd();
    console.warn(`[lint-guard] Total: ${allWarnings.length} violation(s)`);
  } else {
    console.info('[lint-guard] All CSS values use design tokens ✓');
  }
}

/* ------------------------------------------------------------------ */
/*  Auto‑run in dev mode (called from main.js)                        */
if (typeof window !== 'undefined') {
  const isDev = window.location.hostname === 'localhost' ||
                window.location.search.includes('dev=1');
  if (isDev) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runLintCheck);
    } else {
      runLintCheck();
    }
  }
}
