#!/bin/bash
# CI Guardrail Script
# Runs lint-guard and a11y-audit checks using jsdom on every commit.
# 
# Requirements:
#   - Node.js installed
#   - package.json with jsdom in devDependencies
#   - Run: ./ci/run-guardrails.sh
# 
# Usage: ./ci/run-guardrails.sh

set -e

echo "=== Running LLMPersonality Guardrails ==="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not found."
  exit 1
fi

# Check for package.json at root
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found at repository root."
  echo "Please ensure package.json exists with jsdom in devDependencies."
  exit 1
fi

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Verify jsdom is available
if ! node -e "require('jsdom')" 2>/dev/null; then
  echo "Error: jsdom not installed."
  echo "Please run: npm install"
  exit 1
fi

# Validate HTML files
echo ""
echo "--- HTML Validation ---"
for page in index.html agents.html about.html; do
  if [ -f "$page" ]; then
    echo "✓ $page exists"
    
    # Check for essential elements
    if grep -q 'data-theme' "$page"; then
      echo "  ✓ data-theme attribute present"
    else
      echo "  ✗ data-theme attribute missing"
    fi
    
    if grep -q 'theme_v1' "$page"; then
      echo "  ✓ theme preloader present"
    else
      echo "  ✗ theme preloader missing"
    fi
    
    if grep -q 'contrast_v1' "$page"; then
      echo "  ✓ contrast preloader present"
    else
      echo "  ✗ contrast preloader missing"
    fi
    
    if grep -q 'skip-link' "$page"; then
      echo "  ✓ skip link present"
    else
      echo "  ✗ skip link missing"
    fi
  else
    echo "✗ $page not found"
  fi
done

# Validate CSS files
echo ""
echo "--- CSS Validation ---"
for css in css/tokens.css css/reset.css css/components.css; do
  if [ -f "$css" ]; then
    echo "✓ $css exists"
  else
    echo "✗ $css not found"
  fi
done

# Validate JS modules
echo ""
echo "--- JS Module Validation ---"
for js in js/theme.js js/modal.js js/scroll-anim.js js/agents-data.js js/agents-ui.js js/main.js js/lint-guard.js js/a11y-audit.js; do
  if [ -f "$js" ]; then
    echo "✓ $js exists"
  else
    echo "✗ $js not found"
  fi
done

# Run lint-guard in jsdom
echo ""
echo "--- CSS Token Lint (via jsdom) ---"
node -e "
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const htmlFiles = ['index.html', 'agents.html', 'about.html'];
let violations = 0;

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  const { document } = dom.window;
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http')) {
      const cssPath = path.join(process.cwd(), href);
      if (fs.existsSync(cssPath)) {
        const css = fs.readFileSync(cssPath, 'utf8');
        const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(/g;
        let match;
        while ((match = colorRegex.exec(css)) !== null) {
          const context = css.substring(Math.max(0, match.index - 20), match.index + 20);
          if (!context.includes('var(') && !context.includes('//') && !context.includes('*')) {
            violations++;
            console.warn('[lint-guard] Possible hard-coded color in ' + href + ': ' + match[0]);
          }
        }
      }
    }
  });
});

if (violations > 0) {
  console.warn('[lint-guard] Total violations: ' + violations);
  process.exit(1);
} else {
  console.info('[lint-guard] CSS token usage OK ✓');
}
" && echo "lint-guard: PASSED" || echo "lint-guard: FAILED"

# Run a11y-audit basic checks
echo ""
echo "--- Accessibility Audit (basic) ---"
node -e "
const { JSDOM } = require('jsdom');
const fs = require('fs');

const htmlFiles = ['index.html', 'agents.html', 'about.html'];
let errors = 0;

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  const { document } = dom.window;
  
  if (!document.querySelector('.skip-link')) {
    console.warn('[a11y-audit] Missing skip link in ' + file);
    errors++;
  }
  
  const themeToggle = document.querySelector('#theme-toggle');
  if (themeToggle && !themeToggle.hasAttribute('aria-label')) {
    console.warn('[a11y-audit] #theme-toggle missing aria-label in ' + file);
    errors++;
  }
  
  const contrastToggle = document.querySelector('#contrast-toggle');
  if (contrastToggle && !contrastToggle.hasAttribute('aria-label')) {
    console.warn('[a11y-audit] #contrast-toggle missing aria-label in ' + file);
    errors++;
  }
  
  if (file === 'agents.html') {
    const modal = document.querySelector('.modal');
    if (modal) {
      if (!modal.hasAttribute('role') || modal.getAttribute('role') !== 'dialog') {
        console.warn('[a11y-audit] Modal missing role="dialog" in ' + file);
        errors++;
      }
      if (!modal.hasAttribute('aria-modal')) {
        console.warn('[a11y-audit] Modal missing aria-modal in ' + file);
        errors++;
      }
    }
  }
});

if (errors > 0) {
  console.warn('[a11y-audit] Total issues: ' + errors);
  process.exit(1);
} else {
  console.info('[a11y-audit] Basic accessibility checks PASSED ✓');
}
" && echo "a11y-audit: PASSED" || echo "a11y-audit: FAILED"


echo ""
echo "=== Guardrails Complete ==="
