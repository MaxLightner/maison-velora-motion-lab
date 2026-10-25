# Maison Velora — The Art of Being Remembered

A cinematic, responsive, static fragrance-showcase concept.

**Live:** https://maxlightner.github.io/maison-velora-motion-lab/

## Experience

- Editorial full-bleed introduction and an ivory brand manifesto.
- Three distinct fragrance characters in the interactive scent theatre.
- Meaningful scent anatomy: top, heart, and base notes with fragrance-specific examples.
- Individually art-directed collection cards and native, keyboard-accessible product-detail dialogs.
- A concluding portrait essay that connects fragrance to memory.

The fragrance house, compositions, and products are **fictional**. This is a design demonstration, not an online shop. Labels and calls to action do not imply purchasable products.

## Technical approach

Buildless HTML, CSS and JavaScript. No runtime dependencies or animation framework; cinematic motion uses CSS transitions and IntersectionObserver. Existing optimized WebP assets are reused.

### Local preview

Serve the repo root through any static HTTP server, for example:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/.

### Checks

```bash
node --check script.js
git diff --check
```

### Accessibility

- Semantic section headings, navigation, descriptive alternative text and visible focus.
- `prefers-reduced-motion` supported, no forced scroll or mouse hijacking.
- Scent selection responds to left/right arrow keys.
- Native `<dialog>` supports focus containment, Escape to close, and backdrop dismissal.
- Mobile navigation uses `inert` while closed.

### Deploy

GitHub Pages serves the repository root. Changes to `main` publish automatically through the repository's existing Pages configuration.
