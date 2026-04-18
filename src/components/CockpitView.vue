<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { beforeStartChecklist, type ChecklistItem } from '../data/checklist';

const props = defineProps<{
  focusedItemId: string | null;
}>();

const cockpitRef = ref<HTMLElement | null>(null);
const mouseX = ref(0.5);
const mouseY = ref(0.5);
const selectedItem = ref<ChecklistItem | null>(null);
const isFocused = ref(false);
const isMouseInside = ref(false);

const handleMouseMove = (event: MouseEvent) => {
  if (!cockpitRef.value) return;
  
  const rect = cockpitRef.value.getBoundingClientRect();
  
  // Normalize mouse position relative to THIS container (2/3 of screen)
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  
  // Clamp values between 0 and 1
  const clampedX = Math.max(0, Math.min(1, x));
  const clampedY = Math.max(0, Math.min(1, y));

  // If user moves mouse after a "jump", resume mouse follow
  isFocused.value = false; 
  mouseX.value = clampedX;
  mouseY.value = clampedY;
};

const handleMouseEnter = () => {
  isMouseInside.value = true;
};

const handleMouseLeave = () => {
  isMouseInside.value = false;
};

// Listen for jump requests from the parent
watch(() => props.focusedItemId, (id) => {
  if (!id) return;
  const item = beforeStartChecklist.find(i => i.id === id);
  if (item && item.x !== undefined && item.y !== undefined) {
    mouseX.value = item.x / 100;
    mouseY.value = item.y / 100;
    isFocused.value = true;
    selectedItem.value = item;
  }
});

const logPosition = (e: MouseEvent) => {
  if (!cockpitRef.value) return;
  const rect = cockpitRef.value.querySelector('.image-wrapper')?.getBoundingClientRect();
  if (!rect) return;
  
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  console.log(`Clicked at X: ${x.toFixed(2)}%, Y: ${y.toFixed(2)}%`);
};

const cockpitStyle = computed(() => {
  const panX = (mouseX.value - 0.5) * 45; 
  const panY = (mouseY.value - 0.5) * 65; 
  
  return {
    transform: `scale(1.5) translate(${-panX}%, ${-panY}%)`,
    transition: isFocused.value ? 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.15s ease-out'
  };
});
</script>

<template>
  <div 
    class="cockpit-viewport" 
    ref="cockpitRef"
    @mousemove="handleMouseMove"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="cockpit-image-container" :style="cockpitStyle">
      <div class="image-wrapper" @click="logPosition">
        <img src="../assets/A320neo-Cockpit.png" alt="A320neo Cockpit" class="cockpit-img" />
        
        <!-- Hotspots -->
        <div 
          v-for="item in beforeStartChecklist" 
          :key="item.id"
          class="hotspot"
          :class="{ active: focusedItemId === item.id }"
          :style="{ left: item.x + '%', top: item.y + '%' }"
          @click.stop="selectedItem = item"
        >
          <div class="hotspot-ring"></div>
          <div class="hotspot-dot"></div>
          <div class="hotspot-label">{{ item.item }}</div>
        </div>
      </div>
    </div>
    
    <div class="crosshair" v-if="isMouseInside"></div>

    <!-- Modal for details -->
    <Transition name="fade">
      <div v-if="selectedItem" class="modal-overlay" @click="selectedItem = null">
        <div class="modal-card" @click.stop>
          <button class="close-btn" @click="selectedItem = null">×</button>
          <div class="panel-tag">{{ selectedItem.panel.toUpperCase() }}</div>
          <h2>{{ selectedItem.item }}</h2>
          <div class="action-required">Action: <span>{{ selectedItem.action }}</span></div>
          <p>{{ selectedItem.description }}</p>
          <div class="modal-footer">
            <button class="btn-primary" @click="selectedItem = null">GOT IT</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cockpit-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #050505;
  cursor: crosshair;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.cockpit-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform;
}

.image-wrapper {
  position: relative;
  display: inline-block;
}

.cockpit-img {
  max-width: none;
  height: 120vh;
  width: auto;
  user-select: none;
  pointer-events: auto;
  box-shadow: 0 0 100px rgba(0,0,0,0.8);
}

.hotspot {
  position: absolute;
  width: 30px;
  height: 30px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
}

.hotspot.active .hotspot-ring {
  border-color: #4CAF50;
  border-width: 3px;
}

.hotspot.active .hotspot-dot {
  background-color: #4CAF50;
}

.hotspot-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(255, 152, 0, 0.8);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.hotspot-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background-color: #ff9800;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px #ff9800;
}

.hotspot-label {
  position: absolute;
  top: 35px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.hotspot:hover .hotspot-label {
  opacity: 1;
}

@keyframes pulse {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: #1a1e23;
  width: 400px;
  padding: 30px;
  border-radius: 12px;
  position: relative;
  border: 1px solid #444;
  color: #ddd;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
}

.panel-tag {
  background: #333;
  color: #aaa;
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

h2 { margin: 0 0 10px 0; color: #fff; font-size: 22px; }

.action-required {
  color: #ff9800;
  font-weight: bold;
  margin-bottom: 20px;
  font-size: 16px;
}

.action-required span {
  color: #fff;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid #ff9800;
  padding: 4px 12px;
  border-radius: 4px;
  margin-left: 8px;
}

p { line-height: 1.6; font-size: 15px; color: #bbb; }

.modal-footer {
  margin-top: 25px;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  background: #ff9800;
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #f57c00;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cockpit-viewport::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.4) 100%);
  pointer-events: none;
}
</style>
