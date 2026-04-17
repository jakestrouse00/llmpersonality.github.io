# The Inkwell Atelier — Architecture Decision Record (v3)

## File Structure
```
/
├── index.html
├── fluid-watercolor.html
├── dynamic-ink.html
├── zen-garden.html
├── sumi-e.html
├── bleed-bloom.html
├── splatter.html
├── gradient-weaver.html
├── gallery.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── fluid-watercolor.js
│   ├── dynamic-ink.js
│   ├── zen-garden.js
│   ├── sumi-e.js
│   ├── bleed-bloom.js
│   ├── splatter.js
│   ├── gradient-weaver.js
│   └── gallery.js
└── assets/
    └── icons.svg
```

## Pages (9 total)
1. **Studio Hub** (`index.html`) — Card grid of all tools, ink-bleed hover previews
2. **Fluid Watercolor** (`fluid-watercolor.html`) — Blooming, bleeding watercolor washes
3. **Dynamic Ink Calligraphy** (`dynamic-ink.html`) — Velocity-sensitive variable-width strokes
4. **Ink Zen Garden** (`zen-garden.html`) — Gravity-well ink guidance, generative landscape
5. **Sumi-e Brush Studio** (`sumi-e.html`) — Dry-brush texture, minimal strokes
6. **Bleed & Bloom Lab** (`bleed-bloom.html`) — Wet-on-wet color mixing physics
7. **Ink Splatter Studio** (`splatter.html`) — Physics splatter with force/angle/viscosity
8. **Wash Gradient Weaver** (`gradient-weaver.html`) — Layered transparent gradient washes
9. **Local Gallery** (`gallery.html`) — Thumbnail grid, remix, delete

## Architecture: Hybrid Modular (Shared Core + Tool Plugins)
- `main.js` provides: InkEngine, InkParticle, InkParticleSystem (300 cap), CanvasManager, animation loop, gallery save/load, sidebar init, utilities
- Each tool script registers under `window.Inkwell[ToolName]` with: `init()`, `renderBlueprint()`, `getBlueprint()`
- Tool scripts define behavior only; shared core handles lifecycle

## Navigation: Vertical Ink-Bar Sidebar
- Persistent left sidebar on all pages
- Single `assets/icons.svg` sprite sheet (9 symbols)
- Icon + tooltip pattern; `.nav-active` triggers ink-bleed CSS effect
- Trunk test: brand at top, all tools visible, gallery at bottom, active state obvious

## Gallery Storage: Low-Res Thumbnail + JSON Blueprint
- `localStorage` key: `inkwell_gallery`
- Each item: `{ id, tool, timestamp, label, thumbnail (100×75 data URL), blueprint }`
- 20-item limit, FIFO eviction
- ~900KB total storage estimate
- Thumbnails render instantly; blueprints used only for Remix

## UI Component Contract (CSS classes in style.css)
- `.tool-controls` — right-side control panel
- `.tool-control-group` — labeled control set
- `.ink-slider` — standardized range input
- `.ink-button` — standardized button
- `.ink-button-save` — prominent save action
- `.ink-button-clear` — destructive clear action
- `.ink-palette` / `.ink-swatch` — color selector
- Tool scripts **MUST NOT** create custom UI elements

## Performance Constraints
- 300-particle hard cap per canvas (enforced by InkParticleSystem)
- `requestAnimationFrame` for all render loops
- Throttled mouse/touch input
- Offscreen canvas for compositing where beneficial

## Locked Decisions
| Decision | Resolution | Date |
|----------|-----------|------|
| Architecture | Hybrid Modular (Core + Plugins) | Round 3 |
| Navigation | Vertical sidebar, SVG sprite sheet | Round 3 |
| Gallery storage | Thumbnail + Blueprint JSON | Round 3 |
| UI consistency | Strict CSS component contract | Round 3 |
| Particle cap | 300 per canvas | Round 3 |
| Save limit | 20 items FIFO | Round 3 |
| Assets | Single icons.svg sprite sheet | Round 3 |
| Textures | CSS-generated only | Round 2 |

