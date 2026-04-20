# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cockpit checklist simulator. Vue 3 + TypeScript + Vite SPA. Interactive A320neo cockpit photo with pan/zoom, hotspots per checklist item, and a side panel showing the phase checklist. No backend — state persists in `localStorage`.

## Commands

- `npm run dev` — Vite dev server.
- `npm run build` — `vue-tsc -b && vite build`. Type-check blocks build.
- `npm run preview` — serve built `dist/`.
- `npm run lint` — ESLint flat config (`eslint.config.js`).
- `npm test` — Vitest watch.
- `npm run test:run` — Vitest one-shot (CI).
- `npm run coverage` — v8 coverage. Thresholds enforced: lines/functions/statements 99%, branches 95% (`vitest.config.ts`). Do not lower; fix coverage instead.
- Single test file: `npx vitest run src/components/ChecklistPanel.test.ts`.
- Filter by name: `npx vitest run -t "renders items"`.

## Architecture

Three-layer split. Data module is the store; `App.vue` owns state; child components are pure presentational.

### State ownership (`src/App.vue`)
Single source of truth for cross-component state:
- `activePhaseId: string` — current flight phase.
- `focusedItemId: string | null` — item the cockpit should pan to.
- `completedByPhase: Map<phaseId, Set<itemId>>` — completion per phase. Toggle reassigns the ref (shallow `watch`, no `deep: true`) so reactivity fires without a deep watcher.
- Children get props, emit events; App decides all state transitions. No child writes to another child — prevents split-brain.
- Seeds from `loadState()` on boot; every phase/completion change triggers `saveState()` via a `watch`.

### Components (`src/components/`)
- `CockpitView.vue` — cockpit photo, hotspots, mouse-driven pan/zoom, programmatic focus on `focusedItemId`. Mouse coords stored normalised (0..1). Hotspot `(x, y)` stored as percent in `checklist.ts` data. Any real `mousemove` cancels the focus lock so the user can regain free panning.
- `ChecklistPanel.vue` — heading + progress bar + list of `ChecklistItemRow`. Stateless; re-emits events upward.
- `PhaseSelector.vue` — phase tabs.
- `ChecklistItemRow.vue` — single row. Click = toggle + focus (both emits fired).

### Data module (`src/data/`)
- `checklist.ts` — A320neo checklist data. Exports:
  - Types: `PanelType`, `ChecklistItem`, `FlightPhase`, `TextSegment`.
  - Data: `flightChecklists` (array of phases).
  - Lookups: `getPhaseById`, `getItemById` — return `undefined` on miss; callers use `?? []`.
  - `DEFAULT_PHASE_ID` — derived from `flightChecklists[0].id`, not hardcoded.
  - `ACRONYMS` + `expandAcronyms(source)` — splits label into `TextSegment[]`; match key sorted longest-first so `MDA/DA` wins over `MDA`. Returns segments (not HTML) to avoid `v-html`.
  - **Adding an acronym**: append to `ACRONYMS`. Regex rebuilds automatically.
  - **Adding a hotspot**: click the cockpit photo in dev mode — `CockpitView.logPosition` logs `(x, y)` as percent to console. Paste into a new `ChecklistItem` in `flightChecklists`.
- `persistence.ts` — `localStorage` wrapper. Key is versioned `cockpit-sim:v1`. `serialize`/`deserialize` convert between runtime `Map<string, Set<string>>` and JSON-friendly `Record<string, string[]>` (Set doesn't survive `JSON.stringify`). `loadState` returns `null` on missing/corrupt/wrong-version blob (logs warning, clears key). Bump version key on breaking schema changes; do not auto-migrate.

### Testing
- Vitest + jsdom + `@vue/test-utils`. `globals: true` — `describe/it/expect` global.
- Tests co-located: `src/**/foo.test.ts` next to `foo.ts`/`foo.vue`.
- Coverage excludes `main.ts`, test files, `vite-env.d.ts`.

### TypeScript / ESLint
- Three tsconfigs: `tsconfig.json` (references), `tsconfig.app.json` (src), `tsconfig.node.json` (configs). `vue-tsc` drives the build type-check.
- ESLint flat config (ESLint 9). Stack: `@eslint/js` + `typescript-eslint` + `eslint-plugin-vue` (`flat/recommended`) + `vue-eslint-parser` (delegates `<script>` to TS parser).
- Unused vars prefixed `_` are allowed. `vue/multi-word-component-names` off.
