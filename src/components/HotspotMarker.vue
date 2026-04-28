<script setup lang="ts">
/**
 * CS Note: Component Composition
 * 
 * Instead of one massive CockpitView, we break out individual markers. 
 * This makes it easier to manage the "active" state and animations for 
 * each hotspot independently.
 */
import { type ChecklistItem } from '../data/checklist';

defineProps<{
  item: ChecklistItem;
  isActive: boolean;
  left: string;
  top: string;
}>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<template>
  <div
    class="hotspot"
    :class="{ active: isActive }"
    :style="{ left, top }"
    @click.stop="$emit('click')"
  >
    <div class="hotspot-ring" />
    <div class="hotspot-dot" />
    <span class="hotspot-label">{{ item.item }}</span>
  </div>
</template>

<style scoped>
.hotspot {
  position: absolute;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  pointer-events: auto;
}

.hotspot-ring {
  position: absolute;
  inset: -8px;
  border: 1.5px solid rgba(255, 152, 0, 0.85);
  background: rgba(255, 152, 0, 0.1);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.hotspot-dot {
  position: absolute;
  inset: 3px;
  background: #ff9800;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(255, 152, 0, 0.85);
}

.hotspot.active .hotspot-ring {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.15);
  border-width: 2px;
}

.hotspot.active .hotspot-dot {
  background: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.85);
}

.hotspot-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  white-space: nowrap;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  text-shadow:
    -1px -1px 0 rgba(0, 0, 0, 0.85),
    1px -1px 0 rgba(0, 0, 0, 0.85),
    -1px 1px 0 rgba(0, 0, 0, 0.85),
    1px 1px 0 rgba(0, 0, 0, 0.85);
}

.hotspot:hover .hotspot-label,
.hotspot.active .hotspot-label {
  opacity: 1;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(0.8);
  }
  100% {
    opacity: 0;
    transform: scale(1.8);
  }
}
</style>
