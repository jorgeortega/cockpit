<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toRefs,
  watch,
} from "vue";
import { ChecklistService } from "../services/ChecklistService";
import { useCockpitViewport } from "../composables/useCockpitViewport";
import HotspotMarker from "./HotspotMarker.vue";
import ItemDetailModal from "./ItemDetailModal.vue";
import CockpitDevTools from "./CockpitDevTools.vue";
import { type ChecklistItem } from "../data/checklist";

const props = defineProps<{
  activePhaseId: string;
  focusedItemId: string | null;
  isMobile: boolean;
}>();

const emit = defineEmits<{
  (e: "hotspot-click", id: string): void;
}>();

// --- Services & Composables ---
const checklistService = ChecklistService.getInstance();
const cockpitRef = ref<HTMLElement | null>(null);
const { isMobile: isMobileRef } = toRefs(props);
const viewport = useCockpitViewport(cockpitRef, isMobileRef);

// --- State ---
const imgRef = ref<HTMLImageElement | null>(null);
const selectedItem = ref<ChecklistItem | null>(null);
const isMouseInside = ref(false);
const isFocused = ref(false);
const devMode = ref(false);
const devClickedCoord = ref<{ x: number; y: number } | null>(null);

// --- Computed ---
const items = computed(() => {
  const allItems = checklistService.getPhaseById(props.activePhaseId)?.items ?? [];
  return allItems.filter((item) => (item.x ?? 0) > 0 && (item.y ?? 0) > 0);
});

const ZOOM_STEP = computed(() => (props.isMobile ? 1.5 : 0.5));

const sceneStyle = computed(() => ({
  width: `${viewport.scaledW.value}px`,
  height: `${viewport.scaledH.value}px`,
}));

const imgStyle = computed(() => ({
  width: `${viewport.scaledW.value}px`,
  height: `${viewport.scaledH.value}px`,
  objectPosition: "left top",
}));

// --- Methods ---
const updateSize = () => {
  if (!cockpitRef.value || !imgRef.value) return;
  const rect = cockpitRef.value.getBoundingClientRect();
  viewport.updateDimensions(
    rect.width,
    rect.height,
    imgRef.value.naturalWidth,
    imgRef.value.naturalHeight
  );
};

const onImageLoad = () => updateSize();

const zoomIn = () => {
  isFocused.value = false;
  viewport.setZoom(viewport.zoom.value + ZOOM_STEP.value);
};

const zoomOut = () => {
  isFocused.value = false;
  viewport.setZoom(viewport.zoom.value - ZOOM_STEP.value);
};

const resetZoom = () => {
  isFocused.value = false;
  viewport.setZoom(1);
};

const onHotspotClick = (item: ChecklistItem) => {
  selectedItem.value = item;
  emit("hotspot-click", item.id);
};

const handleImageClick = (event: MouseEvent) => {
  if (viewport.didDrag.value) return;
  
  // Use currentTarget if available (for tests), fallback to imgRef
  const target = (event.currentTarget as HTMLElement) || imgRef.value;
  if (!target) return;
  
  const rect = target.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  if (devMode.value) {
    devClickedCoord.value = { x: +x.toFixed(2), y: +y.toFixed(2) };
  } else {
    console.log(`Clicked at x: ${x.toFixed(2)}, y: ${y.toFixed(2)}`);
  }
};

const devClosestItem = computed(() => {
  if (!devClickedCoord.value) return null;
  const { x, y } = devClickedCoord.value;
  let closest = null;
  let minDistance = 1.0;

  for (const item of items.value) {
    if (item.x === undefined || item.y === undefined) continue;
    const distance = Math.sqrt(Math.pow(x - item.x, 2) + Math.pow(y - item.y, 2));
    if (distance < minDistance) {
      minDistance = distance;
      closest = item;
    }
  }
  return closest;
});

// --- Touch handling (Pinch-to-zoom) ---
let initialPinchDistance = 0;
let initialZoom = 1;
let pinchCenter: { clientX: number; clientY: number } | null = null;

const getPinchDistance = (event: TouchEvent) => {
  const t1 = event.touches[0];
  const t2 = event.touches[1];
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
};

const onTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 2) {
    initialPinchDistance = getPinchDistance(event);
    initialZoom = viewport.zoom.value;
    const t1 = event.touches[0];
    const t2 = event.touches[1];
    pinchCenter = { clientX: (t1.clientX + t2.clientX) / 2, clientY: (t1.clientY + t2.clientY) / 2 };
  }
};

const onTouchMove = (event: TouchEvent) => {
  if (event.touches.length === 2 && initialPinchDistance > 0) {
    if (event.cancelable) event.preventDefault();
    const scale = getPinchDistance(event) / initialPinchDistance;
    viewport.setZoom(initialZoom * scale, pinchCenter ?? undefined);
  }
};

const onWheel = (event: WheelEvent) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  isFocused.value = false;
  const delta = event.deltaY < 0 ? ZOOM_STEP.value : -ZOOM_STEP.value;
  viewport.setZoom(viewport.zoom.value + delta, { clientX: event.clientX, clientY: event.clientY });
};

// --- Lifecycle ---
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  updateSize();
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(cockpitRef.value!);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  viewport.onWindowMouseUp(); // Cleanup window listeners
});

// --- Watchers ---
watch(() => props.focusedItemId, (id) => {
  if (!id) return;
  const item = items.value.find(i => i.id === id);
  if (item && item.x !== undefined && item.y !== undefined) {
    selectedItem.value = item;
    isFocused.value = true;
    viewport.scrollToCoord(item.x, item.y, 'smooth');
  }
});

defineExpose({
  // State
  zoom: viewport.zoom,
  isDragging: viewport.isDragging,
  didDrag: viewport.didDrag,
  selectedItem,
  devMode,
  items,
  devClickedCoord,
  
  // Methods
  onMouseDown: viewport.onMouseDown,
  onWindowMouseMove: viewport.onWindowMouseMove,
  onWindowMouseUp: viewport.onWindowMouseUp,
  setViewportScroll: viewport.setViewportScroll,
  setZoom: viewport.setZoom,
  zoomIn,
  updateViewportSize: updateSize,
  logPosition: handleImageClick,
  toggleDevMode: () => { devMode.value = !devMode.value; },
  onImageLoad,
  onTouchStart,
  onTouchMove,
  onWheel,

  // Refs (for direct manipulation in tests)
  viewportW: viewport.viewportW,
  viewportH: viewport.viewportH,
  imageNaturalW: viewport.imageNaturalW,
  imageNaturalH: viewport.imageNaturalH,
  cockpitRef,
});

const hotspotStyle = (item: ChecklistItem) => ({
  left: `${Math.round(((item.x ?? 0) / 100) * viewport.scaledW.value)}px`,
  top: `${Math.round(((item.y ?? 0) / 100) * viewport.scaledH.value)}px`,
});
</script>

<template>
  <div class="cockpit-container">
    <div
      ref="cockpitRef"
      class="cockpit-viewport"
      :class="{ 'is-dragging': viewport.isDragging.value }"
      @mousedown="viewport.onMouseDown"
      @wheel="onWheel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @mouseenter="isMouseInside = true"
      @mouseleave="isMouseInside = false"
    >
      <div
        class="cockpit-scene"
        :class="{ 'is-focused': isFocused }"
        :style="sceneStyle"
      >
        <div
          class="image-wrapper"
          @click="handleImageClick"
        >
          <img
            ref="imgRef"
            src="../assets/A320neo-Cockpit.png"
            alt="A320neo Cockpit"
            class="cockpit-img"
            :class="{ 'is-zoomed': viewport.zoom.value > 1 }"
            :style="imgStyle"
            @load="onImageLoad"
          >

          <div class="hotspot-overlay">
            <template v-if="!devMode">
              <HotspotMarker
                v-for="item in items"
                :key="item.id"
                :item="item"
                :is-active="focusedItemId === item.id"
                :left="hotspotStyle(item).left"
                :top="hotspotStyle(item).top"
                @click="onHotspotClick(item)"
              />
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- UI Overlays -->
    <div
      v-if="!isMobile"
      class="zoom-controls"
      role="group"
      aria-label="Zoom controls"
    >
      <button
        type="button"
        class="zoom-button"
        aria-label="Zoom out"
        :disabled="viewport.zoom.value <= viewport.MIN_ZOOM"
        @click="zoomOut"
      >
        -
      </button>
      <button
        type="button"
        class="zoom-button zoom-status"
        aria-label="Reset zoom"
        @click="resetZoom"
      >
        {{ Math.round(viewport.zoom.value * 100) }}%
      </button>
      <button
        type="button"
        class="zoom-button"
        aria-label="Zoom in"
        :disabled="viewport.zoom.value >= viewport.MAX_ZOOM.value"
        @click="zoomIn"
      >
        +
      </button>
    </div>

    <CockpitDevTools
      v-if="!isMobile"
      :dev-mode="devMode"
      :clicked-coord="devClickedCoord"
      :closest-item="devClosestItem"
      @toggle="devMode = !devMode"
    />

    <div
      v-if="isMouseInside && !devMode"
      class="crosshair"
    />

    <ItemDetailModal
      :item="selectedItem"
      @close="selectedItem = null"
    />
  </div>
</template>

<style scoped>
.cockpit-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.cockpit-viewport {
  width: 100%;
  height: 100%;
  overflow: auto;
  background:
    radial-gradient(circle at top, rgba(47, 61, 73, 0.35), transparent 48%),
    #050505;
  cursor: grab;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  touch-action: pan-x pan-y;
  display: flex;
}

.cockpit-viewport.is-dragging {
  cursor: grabbing;
}

.cockpit-scene {
  position: relative;
  flex: 0 0 auto;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.cockpit-img {
  display: block;
  user-select: none;
  box-shadow: 0 0 100px rgba(0, 0, 0, 0.8);
}

.hotspot-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.zoom-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 140;
  display: flex;
  gap: 8px;
}

.zoom-button {
  min-width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(15, 19, 24, 0.88);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.zoom-button:disabled {
  opacity: 0.4;
}

.zoom-status {
  min-width: 76px;
  font-size: 13px;
}

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
  z-index: 120;
}

.cockpit-container::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, transparent 42%, rgba(0, 0, 0, 0.38) 100%);
  pointer-events: none;
  z-index: 100;
}
</style>
