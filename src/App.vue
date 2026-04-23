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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CockpitView from './components/CockpitView.vue'
import ChecklistPanel from './components/ChecklistPanel.vue'
import { DEFAULT_PHASE_ID } from './data/checklist'
import {
  deserialize,
  loadState,
  saveState,
  serialize,
} from './data/persistence'

// Seed from localStorage on boot so the user resumes exactly where they left
// off. `loadState` returns `null` if nothing is saved or if the blob is
// corrupt (already logged + cleared inside the helper).
const saved = loadState()

const activePhaseId = ref<string>(saved?.activePhaseId ?? DEFAULT_PHASE_ID)
const focusedItemId = ref<string | null>(null)
const scrollToId = ref<string | null>(null)
const isMobile = ref(false)
const isChecklistOpen = ref(false)

// Completion state keyed by phase id. A `Map<phaseId, Set<itemId>>` gives us:
//   - O(1) lookup of the active phase's set.
//   - Independent progress per phase without a cross-phase scan.
//   - Easy per-phase reset (just `delete` the key).
// The child only needs the Set for the active phase; we expose it via a
// computed so the child stays oblivious to the Map structure.
const completedByPhase = ref<Map<string, Set<string>>>(
  saved ? deserialize(saved.completed) : new Map(),
)

const activeCompleted = computed<Set<string>>(
  () => completedByPhase.value.get(activePhaseId.value) ?? new Set(),
)

// Pan the cockpit to the requested item. Does not touch completion state.
const handleFocusItem = (id: string) => {
  focusedItemId.value = id
  if (isMobile.value) isChecklistOpen.value = false
}

// Switch flight phase. Clear any focused item so the next phase doesn't show
// a stale "jump" animation carried over from the previous phase's items.
const handlePhaseChange = (phaseId: string) => {
  activePhaseId.value = phaseId
  focusedItemId.value = null
  if (isMobile.value) isChecklistOpen.value = false
}

// Toggle completion for a single item in the current phase. Mutates the Map
// then reassigns the ref so Vue picks up the change (reassignment is the
// cheapest way to keep reactivity without a wrapping deep-watcher).
const handleToggleItem = (id: string) => {
  const next = new Map(completedByPhase.value)
  const set = new Set(next.get(activePhaseId.value) ?? new Set<string>())
  if (set.has(id)) set.delete(id)
  else set.add(id)
  next.set(activePhaseId.value, set)
  completedByPhase.value = next
}

// Mark an item as complete idempotently (only adds, never removes). Triggered
// when the user clicks a hotspot in the cockpit. Also triggers an auto-scroll
// in the checklist panel.
const handleCompleteItem = (id: string) => {
  const next = new Map(completedByPhase.value)
  const set = new Set(next.get(activePhaseId.value) ?? new Set<string>())
  if (!set.has(id)) {
    set.add(id)
    next.set(activePhaseId.value, set)
    completedByPhase.value = next
  }
  scrollToId.value = id
  focusedItemId.value = id
  if (isMobile.value) isChecklistOpen.value = true
}

// Persist on any state change. Each toggle / phase switch reassigns the
// reference (see `handleToggleItem` / `handlePhaseChange`), so a shallow
// watch is enough — no `deep: true` required. The write is cheap (single
// JSON.stringify of a small object), so no debouncing is warranted.
watch([activePhaseId, completedByPhase], () => {
  saveState({
    version: 2,
    activePhaseId: activePhaseId.value,
    completed: serialize(completedByPhase.value),
  })
})

const syncViewportMode = () => {
  isMobile.value = window.innerWidth <= 900
  isChecklistOpen.value = !isMobile.value
}

const toggleChecklist = () => {
  isChecklistOpen.value = !isChecklistOpen.value
}

onMounted(() => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewportMode)
})
</script>

<template>
  <div class="app-layout">
    <main class="cockpit-section">
      <CockpitView
        :focused-item-id="focusedItemId"
        :active-phase-id="activePhaseId"
        @hotspot-click="handleCompleteItem"
      />
    </main>

    <button
      v-if="isMobile"
      type="button"
      class="drawer-toggle"
      :aria-expanded="isChecklistOpen ? 'true' : 'false'"
      aria-controls="checklist-drawer"
      @click="toggleChecklist"
    >
      {{ isChecklistOpen ? 'Hide Checklist' : 'Show Checklist' }}
    </button>

    <div
      v-if="isMobile && isChecklistOpen"
      class="drawer-backdrop"
      @click="toggleChecklist"
    />

    <aside
      id="checklist-drawer"
      class="checklist-section"
      :class="{ mobile: isMobile, open: isChecklistOpen }"
    >
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
  border-radius: 999px;
  padding: 12px 16px;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 60;
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

  .checklist-section.mobile {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: min(72vh, 560px);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -18px 48px rgba(0, 0, 0, 0.45);
    transform: translateY(calc(100% - 72px));
    transition: transform 0.25s ease;
  }

  .checklist-section.mobile.open {
    transform: translateY(0);
  }
}
</style>
