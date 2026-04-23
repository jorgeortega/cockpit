# Design Spec: Hotspot Refinement & Interaction

**Date:** 2026-04-23
**Status:** Approved
**Topic:** Improving cockpit hotspot visuals and checklist interaction flow.

## 1. Problem Statement
The current hotspots in `CockpitView.vue` have several issues:
- **Visuals:** They are too large, not perfectly round, and scale with the image zoom, making them intrusive at high zoom levels.
- **Interaction:** Clicking a hotspot does not provide a direct link to the checklist's completion state or scrolling behavior.
- **Logic:** The current checklist completion is a toggle, which can lead to accidental unchecking when navigating via the cockpit.

## 2. Proposed Solution

### 2.1. Non-Scaling Hotspots
We will implement **SVG Counter-Scaling** to ensure hotspots maintain a constant visual size regardless of the cockpit's zoom level.

- **Implementation:** The `<g class="hotspot">` elements in `CockpitView.vue` will use a dynamic CSS variable or prop-driven scale: `transform: scale(calc(1 / var(--current-zoom)))`.
- **Styling:** Hotspots will be styled with fixed CSS dimensions or SVG `r` values that are optimized for a 1:1 aspect ratio, ensuring they remain perfectly circular.

### 2.2. "Check-Only" Logic
We will introduce a non-toggling completion method in `App.vue`.

- **Method:** `handleCompleteItem(id: string)`
- **Behavior:** Adds the ID to the `completedItems` Set for the active phase. If the ID is already present, the Set remains unchanged (idempotent operation).

### 2.3. Checklist Auto-Scroll
Clicking a hotspot will trigger a "jump" in the checklist panel.

- **Data Flow:**
    1. `CockpitView` emits `hotspot-click(id)`.
    2. `App` handles the event by calling `handleCompleteItem(id)` and updating a `scrollToId` prop.
    3. `ChecklistPanel` watches `scrollToId` and uses `Element.scrollIntoView({ behavior: 'smooth' })` to bring the corresponding checklist row into the viewport.

## 3. Component Changes

### `App.vue`
- Add `handleCompleteItem` logic.
- Manage `scrollToId` state.
- Update `CockpitView` and `ChecklistPanel` prop/event bindings.

### `CockpitView.vue`
- Pass current `zoom` value to the hotspot rendering logic (either via CSS variables or direct style binding).
- Apply counter-scale transform to hotspots.
- Emit `hotspot-click` when a hotspot is clicked.

### `ChecklistPanel.vue`
- Add `scrollToId` prop.
- Implement a `watch` on `scrollToId` to trigger smooth scrolling to the target row.

## 4. Testing Strategy
- **Unit Tests:** Verify that `handleCompleteItem` is idempotent.
- **Component Tests:** 
    - Verify that `CockpitView` hotspots maintain their screen size when the `zoom` prop changes.
    - Verify that clicking a hotspot in `CockpitView` emits the correct event.
    - Verify that `ChecklistPanel` triggers a scroll when `scrollToId` is updated.
