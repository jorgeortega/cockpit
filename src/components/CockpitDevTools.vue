<script setup lang="ts">
/**
 * CS Note: Developer Tools Component
 * 
 * By isolating "Dev Mode" logic, we ensure that production-related code 
 * isn't cluttered with debugging utilities. In a real project, this component 
 * might even be conditionally loaded only in development builds.
 */
import { type ChecklistItem } from '../data/checklist';

defineProps<{
  devMode: boolean;
  clickedCoord: { x: number; y: number } | null;
  closestItem: ChecklistItem | null;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();
</script>

<template>
  <div>
    <button
      class="dev-toggle"
      :class="{ active: devMode }"
      @click="$emit('toggle')"
    >
      {{ devMode ? "Exit Dev" : "Dev Mode" }}
    </button>

    <div
      v-if="devMode && clickedCoord"
      class="dev-panel"
      @mousedown.stop
    >
      <div class="dev-item">
        Clicked: x: {{ clickedCoord.x }}, y: {{ clickedCoord.y }}
      </div>
      <div
        v-if="closestItem"
        class="dev-action"
      >
        Closest: {{ closestItem.item }} ({{ closestItem.id }})
      </div>
      <div
        v-else
        class="dev-progress"
      >
        No item within 1% range
      </div>
    </div>
  </div>
</template>

<style scoped>
.dev-toggle {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 150;
  background: rgba(20, 24, 28, 0.9);
  color: #ff9800;
  border: 1px solid #ff9800;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: bold;
  letter-spacing: 1px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  backdrop-filter: blur(10px);
}

.dev-toggle.active {
  background: #ff9800;
  color: #000;
}

.dev-panel {
  position: absolute;
  bottom: 48px;
  left: 12px;
  z-index: 150;
  width: 260px;
  background: rgba(20, 24, 28, 0.95);
  border: 1px solid #333;
  border-radius: 6px;
  padding: 12px;
  color: #ddd;
  font-size: 13px;
  backdrop-filter: blur(10px);
}

.dev-item {
  color: #fff;
  font-weight: bold;
  margin-bottom: 4px;
}

.dev-action {
  color: #ff9800;
  font-size: 12px;
  margin-bottom: 10px;
}

.dev-progress {
  color: #888;
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

@media (max-width: 900px) {
  .dev-panel {
    width: min(260px, calc(100vw - 24px));
  }
}
</style>
