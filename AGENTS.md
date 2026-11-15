## Project rules
- All demo state lives in one Zustand store (`src/store/app.ts`); `buildState(step)` rebuilds the scenario deterministically so Voltar/Próximo stay consistent.
- Maps are loaded client-only via `LazyMap` (Leaflet breaks SSR); map colors read CSS tokens at runtime.
- Shared selectors derive assistance totals, FIDE and audit metrics from record collections so views cannot diverge.
- H3 risk attributes are deterministic browser-safe model data; all scenario controls and imagery decisions remain in the demo store.
- Basemap is OpenFreeMap vector (dark / positron) with every symbol layer hidden, using an explicit Vite worker URL; CARTO basemaps now require an API key, so do not switch back. Fictional labels and current flood extent are shared by all maps.
- Do not edit `src/routeTree.gen.ts`; TanStack Router regenerates it.
- Do not put secret values in the repo.
