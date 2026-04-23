# Gemini Project Context: Cockpit

A real-time, interactive flight-deck checklist application for the A320neo, designed to help virtual pilots manage flight phases with high-fidelity visual references.

## Project Overview

- **Core Purpose**: Provides a digitized, interactive version of the A320neo checklist, mapped directly to physical controls in the cockpit.
- **Main Technologies**:
  - **Frontend**: Vue 3 (Composition API with `<script setup>`), TypeScript, Vite.
  - **Styling**: Scoped CSS with a focus on dark mode aesthetics and mobile responsiveness.
  - **Testing**: Vitest with `@vue/test-utils` and `jsdom`.
  - **Persistence**: LocalStorage-based state management for flight progress and settings.

## Architecture & Data Flow

- **Unidirectional Data Flow**: The root `App.vue` acts as the single source of truth for global state (active phase, completed items, focused hotspots). Children receive data via props and communicate changes via events.
- **Component Breakdown**:
  - `CockpitView.vue`: A high-performance interactive viewport for the cockpit image. Supports smooth panning, multi-level zooming, and SVG-based hotspots. Includes a built-in **Dev Mode** for coordinate capture.
  - `ChecklistPanel.vue`: Manages the display and interaction of checklist items, grouped by flight phase.
  - `PhaseSelector.vue`: Allows switching between flight phases (e.g., Cockpit Prep, Takeoff, Landing).
- **Data Layer**:
  - `src/data/checklist.ts`: The definitive source for checklist items, panel locations, and aviation acronyms.
  - `src/data/persistence.ts`: Serialization logic for saving/loading state across sessions.

## Key Features

- **Interactive Cockpit**: Visual hotspots that pulse when active and provide detailed descriptions of the required action/panel.
- **Acronym Expansion**: Automatic detection and annotation of aviation acronyms (e.g., ADIRS, ECAM) using `<abbr>` tags for tooltips.
- **Progress Persistence**: Automatically saves completion state to the browser, allowing pilots to resume their flight exactly where they left off.
- **Dev Mode**: An integrated tool for developers to visually map hotspot coordinates (X/Y percentages) directly on the cockpit image.

## Building and Running

### Development
```bash
npm run dev
```
Starts the Vite development server with Hot Module Replacement (HMR).

### Production
```bash
npm run build
```
Runs `vue-tsc` for type checking followed by Vite's production build.

### Testing & Quality
- **Run Tests**: `npm run test` (watch mode) or `npm run test:run` (CI mode).
- **Coverage**: `npm run coverage` generates a V8 coverage report.
- **Linting**: `npm run lint` executes ESLint with Vue-specific rules.

## Development Conventions

- **State Management**: Prefer lifting state to `App.vue` or using a composable over complex store libraries unless the state becomes deeply nested.
- **Component Design**:
  - Keep components focused on presentation or logic; use the `src/data` folder for pure business logic and data structures.
  - Use `lang="ts"` and `<script setup>` for all new components.
- **Styling**: Use scoped CSS. Maintain the "glassmorphism" and high-contrast dark theme consistent with modern avionics.
- **Documentation**: Provide architectural comments in major files (e.g., `App.vue`, `checklist.ts`) to explain the "why" behind patterns.
- **Testing**: Every new feature or data structure should have a corresponding `.test.ts` file. Unit tests for logic and component tests for critical interactions are mandatory.
