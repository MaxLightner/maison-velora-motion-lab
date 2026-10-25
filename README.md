# Maison Velora — The Art of Being Remembered

A cinematic, responsive, static fragrance-showcase concept.

**Live:** https://maxlightner.github.io/maison-velora-motion-lab/

## Experience

- A scroll-directed opening: the full-bleed portrait slowly pushes in, the opening title recedes, and a full-screen memory refrain emerges before the manifesto.
- Three distinct fragrance characters in a pinned scent theatre. As visitors scroll, the fragrance, bottle, color atmosphere, copy, orbiting light, and chapter progress change from Éclipse to Solenne to Vesper.
- Manual fragrance tabs navigate between those chapters on desktop, and switch scents directly on mobile; the theatre does not hijack the mouse wheel.
- Meaningful scent anatomy: top, heart, and base notes with fragrance-specific examples.
- Animated fragrance-note illustrations, subtle editorial-photo parallax, pointer-responsive collection cards, and native, keyboard-accessible product-detail dialogs.
- A concluding portrait essay that connects fragrance to memory.

The fragrance house, compositions, and products are **fictional**. This is a design demonstration, not an online shop. Labels and calls to action do not imply purchasable products.

## Technical approach

Buildless HTML, CSS and JavaScript. No runtime dependencies or animation framework; cinematic motion uses CSS transitions, `requestAnimationFrame` with eased scroll progress, and IntersectionObserver. Existing optimized WebP assets are reused.

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
- `prefers-reduced-motion` supported, with sticky visual journeys and pointer tilts disabled in that mode; no forced scroll or mouse-wheel hijacking.
- Scent selection responds to left/right arrow keys.
- Native `<dialog>` supports focus containment, Escape to close, and backdrop dismissal.
- Mobile navigation uses `inert` while closed.

### Deploy

GitHub Pages serves the repository root. Changes to `main` publish automatically through the repository's existing Pages configuration.
