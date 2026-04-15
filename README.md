# LLMPersonality Website

An open-source, multi-page website for the LLMPersonality multi-agent discussion framework.

## Quick Start

Simply open `index.html` in a browser. No build step or server required.

```bash
# Optional: serve locally
npx serve .

# Run CI guardrails
./ci/run-guardrails.sh
```

## File Structure

```
/
├── index.html          # Home page
├── agents.html         # Agent Explorer
├── about.html          # About & Contributing
├── css/
│   ├── tokens.css      # Design tokens (CSS custom properties)
│   ├── reset.css       # CSS reset
│   └── components.css  # UI components
├── js/
│   ├── theme.js        # Theme/contrast toggle
│   ├── modal.js        # Modal system
│   ├── scroll-anim.js  # Scroll reveal animations
│   ├── agents-data.js  # Agent profiles
│   ├── agents-ui.js    # Agent Explorer UI
│   ├── lint-guard.js   # CSS token lint (dev mode)
│   ├── a11y-audit.js   # Accessibility audit (dev mode)
│   └── main.js         # Page initialization
├── ci/
│   └── run-guardrails.sh  # CI guardrail script
├── docs/
│   └── architecture-decision.md
└── package.json
```

## Features

- **Multi-page architecture** – Three linked pages with shared CSS/JS
- **Interactive Agent Explorer** – Filter, browse, and deep-dive into agent profiles
- **Dark/Light mode** – Persisted theme with zero flash-of-unstyled-content
- **High-contrast mode** – Accessibility toggle for low-vision users
- **Scroll animations** – Smooth reveal effects using IntersectionObserver
- **Design tokens** – Consistent spacing, colors, and typography via CSS custom properties
- **Guardrails** – CSS token linting and accessibility audits (dev mode only)

## Development

```bash
# Install dev dependencies for CI
npm install

# Run guardrails locally
./ci/run-guardrails.sh
```

## Browser Support

Modern browsers with ES module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## License

MIT
