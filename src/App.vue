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
import { computed, ref, watch } from 'vue'
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
}

// Switch flight phase. Clear any focused item so the next phase doesn't show
// a stale "jump" animation carried over from the previous phase's items.
const handlePhaseChange = (phaseId: string) => {
  activePhaseId.value = phaseId
  focusedItemId.value = null
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
</script>

<template>
  <div class="app-layout">
    <main class="cockpit-section">
      <CockpitView 
        :focused-item-id="focusedItemId" 
        :active-phase-id="activePhaseId"
      />
    </main>
    <aside class="checklist-section">
      <ChecklistPanel
        :active-phase-id="activePhaseId"
        :completed-items="activeCompleted"
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
}

.checklist-section {
  flex: 1;
  height: 100%;
  background-color: #121417;
  overflow-y: auto;
}
</style>
