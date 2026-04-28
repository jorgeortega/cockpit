<script setup lang="ts">
/**
 * App.vue — the root component and single source of truth for cross-component
 * state. Two children make up the entire UI:
 *   - CockpitView (presentational)      — photo + hotspots for the active phase.
 *   - ChecklistPanel (presentational)  — list of items for the active phase.
 *
 * State owned here:
 *   - `activePhaseId`   — which flight phase is currently displayed.
 *   - `focusedItemId`   — the checklist item the cockpit should pan to.
 *   - `completedItems`  — ids the user has checked off.
 *
 * Pattern: unidirectional data flow. Children receive props; children emit
 * events; App decides how state changes. No child writes to another child
 * directly, which prevents the classic split-brain bug where two components
 * disagree about truth.
 */
/**
 * CS Note: The "Single Source of Truth" & Unidirectional Data Flow
 *
 * App.vue acts as the "Orchestrator". In complex systems, having multiple
 * components own the same state leads to "Split-Brain" bugs where UI
 * elements disagree about reality.
 *
 * Instead, we:
 * 1. Lift state up to the common ancestor (App.vue).
 * 2. Pass state down via Props (Read-Only).
 * 3. Bubble changes up via Events (Emits).
 *
 * This ensures data flows in one direction, making the system
 * predictable and easier to debug.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import CockpitView from "./components/CockpitView.vue";
import ChecklistPanel from "./components/ChecklistPanel.vue";
import { DEFAULT_PHASE_ID } from "./data/checklist";
import { deserialize, serialize } from "./data/persistence";
import { PersistenceRepository } from "./services/PersistenceRepository";

// Initialize the repository for state management (Repository Pattern)
const persistenceRepo = new PersistenceRepository();

// Seed from localStorage on boot so the user resumes exactly where they left
// off. `persistenceRepo.load()` returns `null` if nothing is saved.
const saved = persistenceRepo.load();

const activePhaseId = ref<string>(saved?.activePhaseId ?? DEFAULT_PHASE_ID);
const focusedItemId = ref<string | null>(null);
const scrollToId = ref<string | null>(null);
const isMobile = ref(false);
const isChecklistOpen = ref(false);
const checklistSectionRef = ref<HTMLElement | null>(null);
const dynamicOpenHeight = ref<number | null>(null);

const MAX_OPEN_HEIGHT_PX = Math.min(window.innerHeight * 0.72, 560); // previous cap

const measureChecklistHeight = () => {
  const section = checklistSectionRef.value;
  if (!section) return;
  // Find the inner card which contains the content we care about.
  const card = section.querySelector('.checklist-card') as HTMLElement | null;
  const overlay = section.querySelector('.checklist-overlay') as HTMLElement | null;
  const measured = (card?.offsetHeight ?? section.scrollHeight ?? 0) + (overlay ? parseInt(getComputedStyle(overlay).paddingTop || '0', 10) : 0);
  // Add a small extra gap for breathing room
  const desired = Math.min(Math.round(measured + 24), MAX_OPEN_HEIGHT_PX);
  dynamicOpenHeight.value = desired;
};

// Completion state keyed by phase id.
const completedByPhase = ref<Map<string, Set<string>>>(
  saved ? deserialize(saved.completed) : new Map(),
);

const activeCompleted = computed<Set<string>>(
  () => completedByPhase.value.get(activePhaseId.value) ?? new Set(),
);

// Pan the cockpit to the requested item. Does not touch completion state.
const handleFocusItem = (id: string) => {
  focusedItemId.value = id;
};

// Switch flight phase. Clear any focused item so the next phase doesn't show
// a stale "jump" animation carried over from the previous phase's items.
const handlePhaseChange = (phaseId: string) => {
  activePhaseId.value = phaseId;
  focusedItemId.value = null;
};

// Toggle completion for a single item in the current phase. Mutates the Map
// then reassigns the ref so Vue picks up the change (reassignment is the
// cheapest way to keep reactivity without a wrapping deep-watcher).
const handleToggleItem = (id: string) => {
  const next = new Map(completedByPhase.value);
  const set = new Set(next.get(activePhaseId.value) ?? new Set<string>());
  if (set.has(id)) set.delete(id);
  else set.add(id);
  next.set(activePhaseId.value, set);
  completedByPhase.value = next;
};

// Mark an item as complete idempotently (only adds, never removes). Triggered
// when the user clicks a hotspot in the cockpit. Also triggers an auto-scroll
// in the checklist panel.
const handleCompleteItem = (id: string) => {
  const next = new Map(completedByPhase.value);
  const set = new Set(next.get(activePhaseId.value) ?? new Set<string>());
  if (!set.has(id)) {
    set.add(id);
    next.set(activePhaseId.value, set);
    completedByPhase.value = next;
  }
  scrollToId.value = id;
  focusedItemId.value = id;
  if (isMobile.value) isChecklistOpen.value = true;
};

// Persist on any state change.
watch([activePhaseId, completedByPhase], () => {
  persistenceRepo.save({
    version: 2,
    activePhaseId: activePhaseId.value,
    completed: serialize(completedByPhase.value),
  });
});

const syncViewportMode = () => {
  isMobile.value = window.innerWidth <= 900;
  isChecklistOpen.value = !isMobile.value;
};

// Touch swipe handling: single-finger vertical swipes open/close the mobile
// checklist. Two-finger gestures (pinch) are handled inside CockpitView so
// these handlers ignore multi-touch.
let touchStartY = 0;
let touchActive = false;
const SWIPE_THRESHOLD = 60; // pixels

const onCockpitTouchStart = (e: TouchEvent) => {
  if (!isMobile.value) return;
  if (e.touches.length !== 1) return;
  touchStartY = e.touches[0].clientY;
  // Only initiate the open-swipe if the touch started within the bottom 10%
  // of the viewport. This reduces accidental opens from general touches.
  const vh = window.innerHeight || document.documentElement.clientHeight;
  if (touchStartY < vh * 0.9) {
    touchActive = false;
    return;
  }
  touchActive = true;
};

const onCockpitTouchMove = (e: TouchEvent) => {
  if (!isMobile.value || !touchActive) return;
  if (e.touches.length !== 1) return;
  const dy = touchStartY - e.touches[0].clientY;
  if (dy > SWIPE_THRESHOLD) {
    isChecklistOpen.value = true;
    touchActive = false;
  }
};

const onCockpitTouchEnd = () => {
  touchActive = false;
};

const onChecklistTouchStart = (e: TouchEvent) => {
  if (!isMobile.value) return;
  if (e.touches.length !== 1) return;
  touchStartY = e.touches[0].clientY;
  touchActive = true;
};

const onChecklistTouchMove = (e: TouchEvent) => {
  if (!isMobile.value || !touchActive) return;
  if (e.touches.length !== 1) return;
  const dy = e.touches[0].clientY - touchStartY;
  if (dy > SWIPE_THRESHOLD) {
    isChecklistOpen.value = false;
    touchActive = false;
  }
};

const onChecklistTouchEnd = () => {
  touchActive = false;
};

onMounted(() => {
  syncViewportMode();
  window.addEventListener("resize", syncViewportMode);
  // measure checklist height when mounted and on resize
  measureChecklistHeight();
  window.addEventListener('resize', measureChecklistHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", syncViewportMode);
  window.removeEventListener('resize', measureChecklistHeight);
});
</script>

<template>
  <div class="app-layout">
    <main
      class="cockpit-section"
      @touchstart="onCockpitTouchStart"
      @touchmove="onCockpitTouchMove"
      @touchend="onCockpitTouchEnd"
    >
      <CockpitView
        :focused-item-id="focusedItemId"
        :active-phase-id="activePhaseId"
        :is-mobile="isMobile"
        @hotspot-click="handleCompleteItem"
      />
    </main>

    <aside
      id="checklist-drawer"
      ref="checklistSectionRef"
      class="checklist-section"
      :class="{ mobile: isMobile, open: isChecklistOpen }"
      :style="isMobile ? { height: isChecklistOpen ? (dynamicOpenHeight ? dynamicOpenHeight + 'px' : '72px') : '72px' } : null"
      @touchstart="onChecklistTouchStart"
      @touchmove="onChecklistTouchMove"
      @touchend="onChecklistTouchEnd"
    >
      <button
        type="button"
        class="drawer-handle"
        aria-label="Toggle checklist"
        @click="(isChecklistOpen = !isChecklistOpen) && measureChecklistHeight()"
      ></button>
      <ChecklistPanel
        :active-phase-id="activePhaseId"
        :completed-items="activeCompleted"
        :scroll-to-id="scrollToId"
        @focus-item="handleFocusItem"
        @phase-change="handlePhaseChange"
        @toggle-item="handleToggleItem"
      />
    </aside>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #000;
}

.cockpit-section {
  flex: 3;
  height: 100%;
  position: relative;
  border-right: 1px solid #333;
  min-width: 0;
}

.checklist-section {
  flex: 1;
  height: 100%;
  background-color: #121417;
  overflow-y: auto;
  min-width: 320px;
  max-width: 420px;
  position: relative;
  z-index: 50;
}

.drawer-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 90;
  border: 1px solid rgba(255, 152, 0, 0.4);
  background: rgba(15, 19, 24, 0.92);
  color: #fff;
  border-radius: 8px;
  width: 56px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 45;
}

@media (max-width: 900px) {
  .app-layout {
    display: block;
  }

  .cockpit-section {
    border-right: none;
    width: 100%;
  }

  .checklist-section {
    min-width: 0;
    max-width: none;
  }

  .checklist-section {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    /* height will be managed inline to allow smooth transitions between
       the peek height and expanded content height */
    height: 72px;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -18px 48px rgba(0, 0, 0, 0.45);
    overflow: hidden;
    transition: height 320ms cubic-bezier(0.2, 0.9, 0.2, 1), box-shadow 200ms ease;
  }

  /* Slight visual change when open */
  .checklist-section.open {
    box-shadow: 0 -22px 64px rgba(0, 0, 0, 0.5);
  }

  .drawer-handle {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 64px;
    height: 32px; /* increased touch target */
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    padding: 0;
    z-index: 110;
    cursor: pointer;
  }

  .drawer-handle::before {
    content: '';
    width: 56px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4) inset;
    display: block;
    transition: background 200ms ease, transform 240ms cubic-bezier(0.2,0.9,0.2,1);
  }

  /* When the drawer is open, elevate the handle visually */
  .checklist-section.open .drawer-handle::before {
    background: rgba(255, 255, 255, 0.18);
    transform: translateY(-2px);
  }
}
</style>
