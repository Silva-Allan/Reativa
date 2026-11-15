## Project rules
- All scenario logic lives in `src/store/engine.ts`: a scenario clock (minutes after T0), a queue of automatic events, and human decisions as functions that mutate a `Data` copy. `src/store/app.ts` is a thin Zustand wrapper (clock speed, notifications, presenter mode).
- Every timestamp comes from the scenario clock (`at(d.clock)`), never from the computer clock.
- `buildState(step)` is a replay of the scripted human decisions up to `STEP_CLOCK[step]`; free use and the script must stay equivalent (see the "playing freely" test). New behaviour goes into an engine event or decision, not into `buildState`.
- Maps are loaded client-only via `LazyMap` (Leaflet breaks SSR); map colors read CSS tokens at runtime.
- Shared selectors derive assistance totals, FIDE and audit metrics from record collections so views cannot diverge.
- H3 risk attributes are deterministic browser-safe model data; all scenario controls and imagery decisions remain in the demo store.
- Basemap is OpenFreeMap vector (dark / positron) with every symbol layer hidden, using an explicit Vite worker URL; CARTO basemaps now require an API key, so do not switch back. Fictional labels and current flood extent are shared by all maps.
- Do not edit `src/routeTree.gen.ts`; TanStack Router regenerates it.
- Do not put secret values in the repo.
