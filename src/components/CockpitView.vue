<script setup lang="ts">
/**
 * CockpitView — interactive cockpit photo with pan/zoom plus per-item
 * hotspots.
 *
 * Responsibilities:
 *   - Render the A320neo cockpit image.
 *   - Overlay a "hotspot" marker for every checklist item in the active flight
 *     phase.
 *   - Pan/zoom the image toward the user's mouse, or toward a programmatically
 *     focused item when the parent requests one.
 *
 * Intentionally out of scope:
 *   - Which items are completed — owned by the parent (App.vue).
 *   - The checklist data itself — owned by `data/checklist.ts`.
 *
 * Pattern: presentational component using props-down / events-up. The parent
 * decides what phase and what item is focused; this component only renders.
 *
 * Acronyms introduced in this file:
 *   PFD = Primary Flight Display
 *   ND  = Navigation Display
 */
import { ref, computed, watch } from 'vue';
import { getPhaseById, type ChecklistItem } from '../data/checklist';

// --- Props ------------------------------------------------------------------
// `activePhaseId` selects which hotspots are shown.
// `focusedItemId` triggers a programmatic pan/zoom toward that item.
const props = defineProps<{
  activePhaseId: string;
  focusedItemId: string | null;
}>();

// --- Local state ------------------------------------------------------------
const cockpitRef = ref<HTMLElement | null>(null);

// Mouse coordinates stored normalised (0..1) relative to this component's
// bounding box. Normalising here keeps the pan math independent of viewport
// size.
const mouseX = ref(0.5);
const mouseY = ref(0.5);

// Item shown in the detail modal, or `null` when the modal is closed.
const selectedItem = ref<ChecklistItem | null>(null);

// `true` while a programmatic "jump to item" transition is playing. Flipped
// back to `false` by any genuine mouse movement so the user can always regain
// free panning.
const isFocused = ref(false);

// Drives the crosshair overlay — only rendered while the cursor is inside.
const isMouseInside = ref(false);

// --- Derived data -----------------------------------------------------------
// Items for the current phase. Resolved via a helper so the lookup rule lives
// in exactly one place (`data/checklist.ts`). `?? []` keeps `v-for` safe if
// the parent ever passes an unknown phase id.
const items = computed<ChecklistItem[]>(
  () => getPhaseById(props.activePhaseId)?.items ?? [],
);

// --- Mouse tracking ---------------------------------------------------------
// Translate raw client coordinates into the 0..1 range so the transform math
// does not depend on the container's pixel size.
const handleMouseMove = (event: MouseEvent) => {
  if (!cockpitRef.value) return;

  const rect = cockpitRef.value.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  // Clamp to [0, 1]: rounding error or a fast cursor exit could otherwise
  // translate the image into an unreachable offset.
  mouseX.value = Math.max(0, Math.min(1, x));
  mouseY.value = Math.max(0, Math.min(1, y));

  // Any real mouse movement cancels the "focused item" lock. Without this the
  // user could be trapped inside a zoom animation they no longer want.
  isFocused.value = false;
};

const handleMouseEnter = () => { isMouseInside.value = true; };
const handleMouseLeave = () => { isMouseInside.value = false; };

// --- Programmatic focus (jump to a checklist item) --------------------------
// When the parent sets `focusedItemId`, look up the item in the current phase
// and snap the pan coordinates to its stored (x, y) percentage. `isFocused`
// switches the CSS transition to a slower curve so the user's eye can follow
// the move.
watch(
  () => props.focusedItemId,
  (id) => {
    if (!id) return;
    const item = items.value.find((i) => i.id === id);
    if (item?.x !== undefined && item.y !== undefined) {
      mouseX.value = item.x / 100;
      mouseY.value = item.y / 100;
      isFocused.value = true;
      selectedItem.value = item;
    }
  },
);

// --- Dev helper -------------------------------------------------------------
// Logs the clicked (x, y) in percent. Handy when authoring new hotspots —
// click the physical switch, copy the coordinates into `checklist.ts`.
const logPosition = (e: MouseEvent) => {
  if (!cockpitRef.value) return;
  const rect = cockpitRef.value
    .querySelector('.image-wrapper')
    ?.getBoundingClientRect();
  if (!rect) return;
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
   
  console.log(`Clicked at X: ${x.toFixed(2)}%, Y: ${y.toFixed(2)}%`);
};

// --- Pan/zoom style ---------------------------------------------------------
// The image is scaled 1.5× and `translate(%, %)` shifts it opposite the
// mouse, so whatever the cursor hovers grows larger. The (45, 65) multipliers
// were hand-tuned to feel responsive without revealing the image edges.
const cockpitStyle = computed(() => {
  const panX = (mouseX.value - 0.5) * 45;
  const panY = (mouseY.value - 0.5) * 65;
  return {
    transform: `scale(1.5) translate(${-panX}%, ${-panY}%)`,
    transition: isFocused.value
      ? 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)' // slower ease for programmatic jumps
      : 'transform 0.15s ease-out',                 // snappy for live cursor
  };
});
</script>

<template>
  <div
    ref="cockpitRef"
    class="cockpit-viewport"
    @mousemove="handleMouseMove"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="cockpit-image-container"
      :style="cockpitStyle"
    >
      <div
        class="image-wrapper"
        @click="logPosition"
      >
        <img
          src="../assets/A320neo-Cockpit.png"
          alt="A320neo Cockpit"
          class="cockpit-img"
        >

        <!-- Hotspots: one marker per item in the active phase. -->
        <div
          v-for="item in items"
          :key="item.id"
          class="hotspot"
          :class="{ active: focusedItemId === item.id }"
          :style="{ left: item.x + '%', top: item.y + '%' }"
          @click.stop="selectedItem = item"
        >
          <div class="hotspot-ring" />
          <div class="hotspot-dot" />
          <div class="hotspot-label">
            {{ item.item }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isMouseInside"
      class="crosshair"
    />

    <!-- Detail modal: shown when the user clicks a hotspot. -->
    <Transition name="fade">
      <div
        v-if="selectedItem"
        class="modal-overlay"
        @click="selectedItem = null"
      >
        <div
          class="modal-card"
          @click.stop
        >
          <button
            class="close-btn"
            @click="selectedItem = null"
          >
            ×
          </button>
          <div class="panel-tag">
            {{ selectedItem.panel.toUpperCase() }}
          </div>
          <h2>{{ selectedItem.item }}</h2>
          <div class="action-required">
            Action: <span>{{ selectedItem.action }}</span>
          </div>
          <p>{{ selectedItem.description }}</p>
          <div class="modal-footer">
            <button
              class="btn-primary"
              @click="selectedItem = null"
            >
              GOT IT
            </button>
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
