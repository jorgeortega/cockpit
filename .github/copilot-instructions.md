# Copilot instructions for this repository (cockpit)

This file helps Copilot-style assistants work effectively in this Vue 3 + TypeScript + Vite SPA. It collects the exact commands, key architecture, and repository-specific conventions required to make accurate edits and tests.

Build / Test / Lint

- Start dev server: npm run dev
- Build (type-check + bundle): npm run build
- Preview built app: npm run preview
- Run tests (watch): npm test
- Run tests once (CI): npm run test:run
- Run coverage (v8): npm run coverage
- Lint code: npm run lint

Run a single test file or filtered tests:
- Single file: npx vitest run src/components/ChecklistPanel.test.ts
- Filter by test name: npx vitest run -t "renders items"

High-level architecture

- Single-page Vue 3 app using Composition API (<script setup>) and Vite.
- App.vue is the single source of truth; it owns:
  - activePhaseId (string)
  - focusedItemId (string | null)
  - completedByPhase (Map<string, Set<string>>) — reactivity via ref reassignment.
- Two main UI parts:
  - CockpitView.vue: interactive cockpit image, pan/zoom, SVG hotspots, Dev Mode to log percent coords.
  - ChecklistPanel.vue: stateless list + progress; receives a Set<string> of completed items.
- Data layer (src/data): checklist.ts (authoritative checklist data, acronyms, helpers) and persistence.ts (localStorage schema, serialize/deserialize).
- Unidirectional data flow: App passes props -> children emit events -> App updates state and persists.

Key repository conventions (non-obvious)

- Checklist data (src/data/checklist.ts):
  - flightChecklists is authoritative; DEFAULT_PHASE_ID is derived from flightChecklists[0].id.
  - Hotspot coords are percentages (x, y). Use CockpitView Dev Mode to capture coords and paste into checklist.ts.
  - ACRONYMS and expandAcronyms(source) return TextSegment[] (not HTML). UI renders <abbr> for accessibility.

- Persistence (src/data/persistence.ts):
  - STORAGE_KEY is versioned (cockpit-sim:v2). Bump version on breaking schema changes; do not auto-migrate old blobs.
  - serialize/deserialize convert between Map<string, Set<string>> and Record<string, string[]>.
  - loadState() returns null and clears malformed or version-mismatched blobs.

- State/reactivity:
  - completedByPhase is a ref wrapping a Map. Handlers create a new Map and reassign the ref so Vue notices changes without deep watchers.
  - ChecklistPanel is intentionally stateless; App must own state changes.

- Testing & coverage:
  - Vitest uses jsdom and enables globals (describe/it/expect).
  - Coverage thresholds are strict (lines/functions/statements: 99%; branches: 95%). Add tests rather than lowering thresholds.

- ESLint & TypeScript:
  - ESLint uses a flat config (eslint.config.js) with vue-eslint-parser for .vue files.
  - Unused variables prefixed with `_` are allowed via rule configuration.
  - Build runs vue-tsc type checks; type errors block `npm run build`.

AI assistant and repo integration notes

- When altering persisted shape, increment STORAGE_KEY version and document the bump in persistence.ts.
- Edit checklist data in src/data/checklist.ts. DEFAULT_PHASE_ID follows the first entry — reordering changes the default.
- Keep children presentational where possible; App.vue should continue to own cross-component state.
- Co-locate tests next to source files under src/.

References scanned while authoring:
- README.md, CLAUDE.md, AGENTS.md, src/App.vue, src/components/*, src/data/*, vitest.config.ts, eslint.config.js, package.json

MCP servers

- This is a web UI. Consider configuring a Playwright MCP server for end-to-end/browser tests. Ask whether Playwright should be added.

---
Created from existing docs and key source files. Update this file when build/test scripts or storage schema change.
