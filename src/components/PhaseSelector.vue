<script setup lang="ts">
/**
 * PhaseSelector — horizontal tab strip for picking the active flight phase.
 *
 * Why tabs instead of a dropdown?
 *   Flight phases are an ordered, linear sequence (preliminary → shutdown).
 *   A tab strip exposes that structure at a glance and lets a student see
 *   where they are in the flow. A dropdown hides it behind a click.
 *
 * Pattern: pure presentational component. Props in (the list of phases and
 * which one is active), events out (`phase-change` when the user picks a new
 * tab). No internal state — that keeps the parent (App.vue) as the single
 * source of truth.
 *
 * Accessibility notes:
 *   - The container carries `role="tablist"` and each button carries
 *     `role="tab"` + `aria-selected` so screen readers announce the widget
 *     the way users expect.
 *   - Full keyboard navigation (arrow keys, Home/End) lands in a later
 *     slice; the current version already supports native Tab focus + Enter
 *     / Space activation via the button element.
 */
import type { FlightPhase } from '../data/checklist'

const props = defineProps<{
  phases: FlightPhase[]
  activePhaseId: string
}>()

const emit = defineEmits<{
  (e: 'phase-change', id: string): void
}>()

// Clicking the already-active tab is ignored. Emitting anyway would force the
// parent to do redundant work (e.g. resetting `focusedItemId`) on a no-op.
const selectPhase = (id: string) => {
  if (id === props.activePhaseId) return
  emit('phase-change', id)
}

// Keyboard navigation on the tab strip. Standard WAI-ARIA tablist behaviour:
//   ArrowLeft  / ArrowRight — previous / next (wraps at both ends).
//   Home / End              — jump to the first / last tab.
// Anything else is ignored so the browser's native shortcuts still work.
// We compute the target id, then reuse `selectPhase` so the same no-op guard
// kicks in if the caller is already on the target tab.
const onKeydown = (event: KeyboardEvent) => {
  const total = props.phases.length
  if (total === 0) return

  const currentIndex = Math.max(
    0,
    props.phases.findIndex((p) => p.id === props.activePhaseId),
  )

  let targetIndex: number
  switch (event.key) {
    case 'ArrowRight':
      targetIndex = (currentIndex + 1) % total
      break
    case 'ArrowLeft':
      targetIndex = (currentIndex - 1 + total) % total
      break
    case 'Home':
      targetIndex = 0
      break
    case 'End':
      targetIndex = total - 1
      break
    default:
      return
  }

  event.preventDefault()
  selectPhase(props.phases[targetIndex].id)
}
</script>

<template>
  <div
    class="phase-selector"
    role="tablist"
    aria-label="Flight phases"
    @keydown="onKeydown"
  >
    <button
      v-for="phase in phases"
      :key="phase.id"
      type="button"
      role="tab"
      class="tab"
      :class="{ active: phase.id === activePhaseId }"
      :aria-selected="phase.id === activePhaseId ? 'true' : 'false'"
      :tabindex="phase.id === activePhaseId ? 0 : -1"
      @click="selectPhase(phase.id)"
    >
      {{ phase.label }}
    </button>
  </div>
</template>

<style scoped>
.phase-selector {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.3);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.phase-selector::-webkit-scrollbar {
  height: 6px;
}

.phase-selector::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.tab {
  flex: 0 0 auto;
  background: transparent;
  border: none;
  color: #888;
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;
  border-bottom: 2px solid transparent;
}

.tab:hover {
  color: #ccc;
  background: rgba(255, 255, 255, 0.04);
}

.tab:focus-visible {
  outline: 2px solid #ff9800;
  outline-offset: 2px;
}

.tab.active {
  color: #ff9800;
  border-bottom-color: #ff9800;
  background: rgba(255, 152, 0, 0.08);
}
</style>
