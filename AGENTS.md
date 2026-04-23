# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vue 3 + TypeScript + Vite single-page app for an A320neo cockpit checklist simulator. Application code lives in `src/`. Use `src/components/` for Vue SFCs, `src/data/` for checklist and persistence logic, `src/assets/` for cockpit images, and `public/` for static icons. Keep tests next to the code they cover, for example `src/components/ChecklistPanel.test.ts` beside `ChecklistPanel.vue`.

## Build, Test, and Development Commands
- `npm run dev`: start the Vite dev server.
- `npm run build`: run `vue-tsc -b` and produce a production build in `dist/`.
- `npm run preview`: serve the built app locally.
- `npm run lint`: run ESLint 9 with the flat config in `eslint.config.js`.
- `npm test`: run Vitest in watch mode.
- `npm run test:run`: run the full test suite once.
- `npm run coverage`: generate V8 coverage reports (`text`, `html`, `lcov`).

## Coding Style & Naming Conventions
Use TypeScript and Vue `<script setup>` SFCs. Follow the existing style in `src/`: components use `PascalCase.vue`, data modules use lowercase names like `checklist.ts`, and tests use `*.test.ts`. Prefer clear prop/event contracts and keep cross-component state in `App.vue`. ESLint allows intentionally unused variables only when prefixed with `_`. Keep formatting consistent with the current codebase: two-space indentation in Vue templates/CSS and the repository’s existing TypeScript style.

## Testing Guidelines
Vitest runs in `jsdom` with `@vue/test-utils`. Co-locate tests under `src/` and name them `*.test.ts` or `*.spec.ts`. Coverage thresholds are enforced in `vitest.config.ts`: `99%` for lines, functions, and statements, and `95%` for branches. Do not lower thresholds; add tests instead. Example: `npx vitest run src/data/persistence.test.ts`.

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects such as `Improve checklist`. Keep commit messages concise and focused on one change. For pull requests, include a clear summary, list behavior changes, link related issues, and attach screenshots or short recordings for UI updates. Confirm `npm run lint` and `npm run test:run` pass before requesting review.

## Architecture Notes
This app has no backend; persisted state is stored in `localStorage` via `src/data/persistence.ts`. Treat `src/data/checklist.ts` as the source of truth for flight phases, checklist items, and cockpit hotspot coordinates.
