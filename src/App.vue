<script setup lang="ts">
import { ref } from 'vue'
import CockpitView from './components/CockpitView.vue'
import ChecklistOverlay from './components/ChecklistOverlay.vue'
import { flightChecklists } from './data/checklist'

const activePhaseId = ref(flightChecklists[0].id)
const focusedItemId = ref<string | null>(null)
const completedItems = ref<Set<string>>(new Set())

const handleFocusItem = (id: string) => {
  focusedItemId.value = id
}

const handlePhaseChange = (phaseId: string) => {
  activePhaseId.value = phaseId
  focusedItemId.value = null // Clear focus when changing phase
}

const handleToggleItem = (id: string) => {
  if (completedItems.value.has(id)) {
    completedItems.value.delete(id)
  } else {
    completedItems.value.add(id)
  }
}
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
      <ChecklistOverlay 
        :active-phase-id="activePhaseId"
        :completed-items="completedItems"
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
