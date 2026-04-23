# Hotspot Refinement & Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve hotspot visuals by making them non-scaling and round, and link hotspot clicks to a checklist "check-only" action and auto-scrolling.

**Architecture:** Use SVG counter-scaling in `CockpitView.vue` to maintain constant hotspot size. Update `App.vue` to handle idempotent completion logic and pass a `scrollToId` prop to `ChecklistPanel.vue`, which uses `scrollIntoView`.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Vitest, CSS.

---

### Task 1: Idempotent Completion & Scroll State in `App.vue`

**Files:**
- Modify: `src/App.vue`
- Test: `src/App.test.ts`

- [ ] **Step 1: Write a test for the check-only behavior**

Modify `src/App.test.ts` to include a test for a new `handleCompleteItem` behavior (triggered by hotspot clicks).

```typescript
import { mount } from '@vue/test-utils'
import App from './App.vue'
import { describe, it, expect } from 'vitest'

describe('App Completion Logic', () => {
  it('adds an item to completed set but never removes it', async () => {
    const wrapper = mount(App)
    // Access internal handleCompleteItem via exposed method or by triggering the event from child
    // Since we'll add it to handle hotspot-click, we can trigger it from CockpitView
    // For now, let's assume handleCompleteItem is the goal.
  })
})
```

- [ ] **Step 2: Run tests to verify it fails**

Run: `npm run test src/App.test.ts`
Expected: FAIL (method or behavior not implemented)

- [ ] **Step 3: Implement `handleCompleteItem` and `scrollToId` in `App.vue`**

Modify `src/App.vue`:
1. Add `const scrollToId = ref<string | null>(null)`
2. Add `handleCompleteItem` function:
```typescript
const handleCompleteItem = (id: string) => {
  const next = new Map(completedByPhase.value)
  const set = new Set(next.get(activePhaseId.value) ?? new Set<string>())
  if (!set.has(id)) {
    set.add(id)
    next.set(activePhaseId.value, set)
    completedByPhase.value = next
  }
  scrollToId.value = id
  // Also focus the item visually
  focusedItemId.value = id
}
```
3. Update `CockpitView` component tag to listen for `@hotspot-click="handleCompleteItem"`.
4. Update `ChecklistPanel` component tag to pass `:scroll-to-id="scrollToId"`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npm run test src/App.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.vue src/App.test.ts
git commit -m "feat: implement idempotent completion and scroll state in App.vue"
```

---

### Task 2: Non-Scaling Hotspots in `CockpitView.vue`

**Files:**
- Modify: `src/components/CockpitView.vue`
- Test: `src/components/CockpitView.test.ts`

- [ ] **Step 1: Write a test for the non-scaling behavior**

Modify `src/components/CockpitView.test.ts` to verify that the hotspot group has a transform that counters the zoom.

- [ ] **Step 2: Run tests to verify it fails**

Run: `npm run test src/components/CockpitView.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement counter-scaling in `CockpitView.vue`**

1. Update the `<g class="hotspot">` tag to include a dynamic style:
```html
<g
  v-for="item in items"
  :key="item.id"
  class="hotspot"
  :class="{ active: focusedItemId === item.id }"
  :transform="`translate(${item.x ?? 50} ${item.y ?? 50})`"
  :style="{ transform: `translate(${item.x ?? 50}px, ${item.y ?? 50}px) scale(${1 / zoom})` }"
  @click.stop="onHotspotClick(item)"
>
```
Wait, the `transform` attribute is already used for translation. We should use CSS `transform` for the scale or combine them. Better to use a CSS variable for zoom on the parent and `scale(calc(1 / var(--zoom)))` on the hotspots.

2. Add a `hotspot-click` event emission:
```typescript
const emit = defineEmits<{
  (e: 'hotspot-click', id: string): void;
}>();

const onHotspotClick = (item: ChecklistItem) => {
  selectedItem.value = item;
  emit('hotspot-click', item.id);
};
```

3. Update styles for roundness and fixed size:
```css
.hotspot-ring {
  r: 12px; /* Fixed radius in pixels, but SVG coordinates might scale it. 
              Actually, since we counter-scale the group, '12' will be 12px on screen. */
  stroke-width: 2px;
}
.hotspot-dot {
  r: 4px;
}
```

- [ ] **Step 4: Run tests to verify it passes**

Run: `npm run test src/components/CockpitView.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CockpitView.vue src/components/CockpitView.test.ts
git commit -m "feat: implement non-scaling round hotspots in CockpitView.vue"
```

---

### Task 3: Auto-Scrolling in `ChecklistPanel.vue`

**Files:**
- Modify: `src/components/ChecklistPanel.vue`
- Test: `src/components/ChecklistPanel.test.ts`

- [ ] **Step 1: Write a test for auto-scrolling**

Modify `src/components/ChecklistPanel.test.ts` to verify that `scrollIntoView` is called when `scrollToId` changes.

- [ ] **Step 2: Run tests to verify it fails**

Run: `npm run test src/components/ChecklistPanel.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `scrollToId` and `scrollIntoView`**

1. Add `scrollToId` prop to `ChecklistPanel.vue`.
2. Add a `watch` on `scrollToId`:
```typescript
watch(() => props.scrollToId, async (id) => {
  if (!id) return;
  await nextTick();
  const el = document.getElementById(`item-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
```
3. Ensure each `ChecklistItemRow` or its container has an `id` that matches `item-${id}`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npm run test src/components/ChecklistPanel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ChecklistPanel.vue src/components/ChecklistPanel.test.ts
git commit -m "feat: implement auto-scrolling in ChecklistPanel.vue"
```

---

### Task 4: Final Integration & Regression Check

- [ ] **Step 1: Verify all interactions in the browser**

Check:
1. Zooming in/out doesn't change hotspot size.
2. Clicking a hotspot checks the item in the checklist.
3. Clicking an already checked item via hotspot keeps it checked.
4. Clicking a hotspot scrolls the checklist to that item.

- [ ] **Step 2: Run all tests**

Run: `npm run test`
Expected: ALL PASS

- [ ] **Step 3: Run Linting**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Final Commit**

```bash
git commit -m "feat: complete hotspot refinement and checklist interaction"
```
