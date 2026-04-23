<script setup lang="ts">
/**
 * ChecklistPanel — side panel listing checklist items for the active flight
 * phase, with a PhaseSelector at the top.
 *
 * Pattern: pure presentational component. Props in, events out, no internal
 * state. A stateless component is:
 *   - Trivial to test — the output is a function of the props.
 *   - Trivial to persist — the single owner (App.vue) writes to storage.
 *   - Immune to the split-brain bug where two components disagree about truth.
 *
 * Acronyms introduced in this file:
 *   QRH = Quick Reference Handbook (the paper checklist this UI mimics)
 */
import { computed, nextTick, watch } from 'vue';
import { flightChecklists, getPhaseById } from '../data/checklist';
import PhaseSelector from './PhaseSelector.vue';
import ChecklistItemRow from './ChecklistItemRow.vue';

// --- Props ------------------------------------------------------------------
// `activePhaseId` selects which phase's items to render.
// `completedItems` is the Set of item ids the parent considers checked off.
// `scrollToId` is an optional item id to smoothly scroll into view.
const props = defineProps<{
  activePhaseId: string;
  completedItems: Set<string>;
  scrollToId?: string | null;
}>();

// --- Events -----------------------------------------------------------------
// Typed emits (tuple form). The compiler catches wrong payload shapes at the
// call site instead of letting them slip into runtime. `phase-change` simply
// re-emits the child selector's event so the parent owns phase state.
const emit = defineEmits<{
  (e: 'toggle-item', id: string): void;
  (e: 'focus-item', id: string): void;
  (e: 'phase-change', id: string): void;
}>();

// --- Derived data -----------------------------------------------------------
// Resolve the phase once per render. `?? []` keeps `v-for` safe if the parent
// supplies an unknown phase id.
const items = computed(() => getPhaseById(props.activePhaseId)?.items ?? []);

// Header reflects the active phase label — students learning the flow benefit
// from an explicit "what am I looking at" cue.
const heading = computed(
  () => getPhaseById(props.activePhaseId)?.label ?? 'Checklist',
);

// Progress expressed as a 0..100 percent string, suitable for a CSS width.
// Returns '0%' for an empty phase so the bar collapses cleanly instead of
// triggering a division by zero.
const progressPercent = computed(() => {
  const total = items.value.length;
  if (total === 0) return '0%';
  return `${(props.completedItems.size / total) * 100}%`;
});

// --- Handlers ---------------------------------------------------------------
// A row click carries two intents: mark the item done and pan the cockpit to
// its physical location. The row component emits `toggle` + `focus`; we
// bridge those to the panel's public event names so the parent sees a stable
// contract regardless of how the row is implemented.
const onRowToggle = (id: string) => emit('toggle-item', id);
const onRowFocus = (id: string) => emit('focus-item', id);

// --- Side Effects -----------------------------------------------------------
// Smoothly scroll the requested item into view. Triggered when the parent
// updates `scrollToId` (usually following a cockpit hotspot click).
watch(() => props.scrollToId, async (id) => {
  if (!id) return;
  // Ensure the DOM has updated with the new phase/items before searching.
  await nextTick();
  const el = document.getElementById(`item-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
</script>

<template>
  <div class="checklist-overlay">
    <PhaseSelector
      :phases="flightChecklists"
      :active-phase-id="activePhaseId"
      @phase-change="(id) => emit('phase-change', id)"
    />
    <div class="checklist-card">
      <h3>{{ heading }}</h3>
      <div
        class="progress-bar"
        role="progressbar"
        :aria-valuenow="completedItems.size"
        :aria-valuemin="0"
        :aria-valuemax="items.length"
      >
        <div
          class="progress-bar-fill"
          :style="{ width: progressPercent }"
        />
      </div>
      <div class="checklist-items">
        <ChecklistItemRow
          v-for="item in items"
          :id="`item-${item.id}`"
          :key="item.id"
          :item="item"
          :completed="completedItems.has(item.id)"
          @toggle="onRowToggle"
          @focus="onRowFocus"
        />
      </div>
      <div class="progress">
        {{ completedItems.size }} / {{ items.length }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.checklist-overlay {
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}

.checklist-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  color: #fff;
  width: 100%;
  box-sizing: border-box;
}

h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #aaa;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress {
  margin-top: 16px;
  font-size: 12px;
  text-align: right;
  color: #888;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  margin-bottom: 14px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.25s ease-out;
}
</style>
