<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import {
  flightChecklists,
  getPhaseById,
  type ChecklistItem,
} from "../data/checklist";

const props = defineProps<{
  activePhaseId: string;
  focusedItemId: string | null;
}>();

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
// Use 50% fixed increments for fast zooming as requested.
const ZOOM_STEP = 0.5;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const cockpitRef = ref<HTMLElement | null>(null);
const imageWrapperRef = ref<HTMLElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);

// Displayed image content box (inside the img element)
const imageDisplayW = ref(0);
const imageDisplayH = ref(0);
const imageOffsetX = ref(0);
const imageOffsetY = ref(0);

/**
 * Measure the actual displayed image content inside the image-wrapper.
 * Since we now always size the image to fill the scene width (fit-to-width),
 * the display box matches the scaled dimensions without offsets.
 */
const computeImageBox = () => {
  if (scaledW.value <= 0 || scaledH.value <= 0) {
    imageDisplayW.value = 0;
    imageDisplayH.value = 0;
    imageOffsetX.value = 0;
    imageOffsetY.value = 0;
    return;
  }

  imageDisplayW.value = scaledW.value;
  imageDisplayH.value = scaledH.value;
  imageOffsetX.value = 0;
  imageOffsetY.value = 0;
};
const viewportW = ref(0);
const viewportH = ref(0);
const imageNaturalW = ref(0);
const imageNaturalH = ref(0);
const zoom = ref(1);
const selectedItem = ref<ChecklistItem | null>(null);
const isMouseInside = ref(false);
const isDragging = ref(false);
const isFocused = ref(false);

const emit = defineEmits<{
  (e: "hotspot-click", id: string): void;
}>();

const items = computed<ChecklistItem[]>(() => {
  const allItems = getPhaseById(props.activePhaseId)?.items ?? [];
  return allItems.filter((item) => (item.x ?? 0) > 0 && (item.y ?? 0) > 0);
});

const updateViewportSize = () => {
  if (!cockpitRef.value) return;
  const rect = cockpitRef.value.getBoundingClientRect();
  viewportW.value = rect.width;
  viewportH.value = rect.height;
};

const onImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement;
  imageNaturalW.value = img.naturalWidth;
  imageNaturalH.value = img.naturalHeight;
  updateViewportSize();
  nextTick().then(() => computeImageBox());
};

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  updateViewportSize();
  if (imgRef.value?.complete && imgRef.value.naturalWidth > 0) {
    imageNaturalW.value = imgRef.value.naturalWidth;
    imageNaturalH.value = imgRef.value.naturalHeight;
    nextTick().then(() => computeImageBox());
  }

  if (cockpitRef.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      updateViewportSize();
      computeImageBox();
    });
    resizeObserver.observe(cockpitRef.value);
    if (imageWrapperRef.value) resizeObserver.observe(imageWrapperRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener("mousemove", onWindowMouseMove);
  window.removeEventListener("mouseup", onWindowMouseUp);
  window.removeEventListener("mousemove", onDevToggleMouseMove);
  window.removeEventListener("mouseup", onDevToggleMouseUp);
});

const baseScale = computed(() => {
  const iw = imageNaturalW.value;
  if (iw <= 0) return 1;
  const vw = viewportW.value > 0 ? viewportW.value : window.innerWidth;
  // Use fit-to-width as the baseline for consistent initial load and smooth zoom.
  return vw / iw;
});

const scaledW = computed(
  () => imageNaturalW.value * baseScale.value * zoom.value,
);
const scaledH = computed(
  () => imageNaturalH.value * baseScale.value * zoom.value,
);

const sceneStyle = computed(() => {
  if (scaledW.value <= 0 || scaledH.value <= 0)
    return { width: "100%", height: "100%" };

  return {
    width: `${Math.round(scaledW.value)}px`,
    height: `${Math.round(scaledH.value)}px`,
  };
});

const overlayTransitionClass = computed(() =>
  isFocused.value ? "is-focused" : "",
);

const setViewportScroll = (
  left: number,
  top: number,
  behavior: "auto" | "smooth" = "auto",
) => {
  if (!cockpitRef.value) return;
  const maxLeft = Math.max(0, scaledW.value - viewportW.value);
  const maxTop = Math.max(0, scaledH.value - viewportH.value);
  const nextLeft = clamp(left, 0, maxLeft);
  const nextTop = clamp(top, 0, maxTop);
  if (
    cockpitRef.value &&
    typeof (cockpitRef.value as any).scrollTo === "function"
  ) {
    try {
      (cockpitRef.value as any).scrollTo({
        left: nextLeft,
        top: nextTop,
        behavior,
      });
    } catch {
      cockpitRef.value.scrollLeft = nextLeft;
      cockpitRef.value.scrollTop = nextTop;
    }
  } else {
    cockpitRef.value.scrollLeft = nextLeft;
    cockpitRef.value.scrollTop = nextTop;
  }
};

const setZoom = async (nextZoom: number) => {
  if (!cockpitRef.value || scaledW.value <= 0 || scaledH.value <= 0) {
    zoom.value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    return;
  }

  const currentCenterX = cockpitRef.value.scrollLeft + viewportW.value / 2;
  const currentCenterY = cockpitRef.value.scrollTop + viewportH.value / 2;
  const widthRatio = currentCenterX / scaledW.value;
  const heightRatio = currentCenterY / scaledH.value;

  zoom.value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  await nextTick();

  const nextCenterX = widthRatio * scaledW.value;
  const nextCenterY = heightRatio * scaledH.value;
  setViewportScroll(
    nextCenterX - viewportW.value / 2,
    nextCenterY - viewportH.value / 2,
  );
};

const zoomIn = async (event?: Event) => {
  isFocused.value = false;
  await setZoom(zoom.value + ZOOM_STEP);
  try {
    if (cockpitRef.value) {
      setViewportScroll(cockpitRef.value.scrollLeft, 0, "auto");
    }
  } catch {}
  try {
    (event?.currentTarget as HTMLElement | undefined)?.blur?.();
  } catch {}
};

const zoomOut = async (event?: Event) => {
  isFocused.value = false;
  await setZoom(zoom.value - ZOOM_STEP);
  try {
    if (cockpitRef.value) {
      setViewportScroll(cockpitRef.value.scrollLeft, 0, "auto");
    }
  } catch {}
  try {
    (event?.currentTarget as HTMLElement | undefined)?.blur?.();
  } catch {}
};

const resetZoom = async (event?: Event) => {
  isFocused.value = false;
  await setZoom(1);
  try {
    if (cockpitRef.value) {
      setViewportScroll(cockpitRef.value.scrollLeft, 0, "auto");
    }
  } catch {}
  try {
    (event?.currentTarget as HTMLElement | undefined)?.blur?.();
  } catch {}
};

let dragStartX = 0;
let dragStartY = 0;
let dragStartLeft = 0;
let dragStartTop = 0;
let didDrag = false;
const DRAG_THRESHOLD_PX = 3;

const onWindowMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !cockpitRef.value) return;
  const dx = event.clientX - dragStartX;
  const dy = event.clientY - dragStartY;
  if (
    !didDrag &&
    (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)
  ) {
    didDrag = true;
  }
  setViewportScroll(dragStartLeft - dx, dragStartTop - dy);
};

const onWindowMouseUp = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  window.removeEventListener("mousemove", onWindowMouseMove);
  window.removeEventListener("mouseup", onWindowMouseUp);
};

const onMouseDown = (event: MouseEvent) => {
  if (event.button !== 0 || !cockpitRef.value) return;
  const target = event.target as HTMLElement | null;
  if (
    target?.closest(
      ".hotspot, .modal-overlay, .dev-toggle, .dev-panel, .zoom-controls",
    )
  )
    return;

  isDragging.value = true;
  isFocused.value = false;
  didDrag = false;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartLeft = cockpitRef.value.scrollLeft;
  dragStartTop = cockpitRef.value.scrollTop;
  window.addEventListener("mousemove", onWindowMouseMove);
  window.addEventListener("mouseup", onWindowMouseUp);
  event.preventDefault();
};

let initialPinchDistance = 0;
let initialZoom = 1;

const getPinchDistance = (event: TouchEvent) => {
  const t1 = event.touches[0];
  const t2 = event.touches[1];
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
};

const onTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 2) {
    initialPinchDistance = getPinchDistance(event);
    initialZoom = zoom.value;
  }
};

const onTouchMove = async (event: TouchEvent) => {
  if (event.touches.length === 2) {
    // Prevent default browser zoom/scroll while pinching
    if (event.cancelable) event.preventDefault();

    const currentDistance = getPinchDistance(event);
    if (initialPinchDistance > 0) {
      const scale = currentDistance / initialPinchDistance;
      const nextZoom = initialZoom * scale;
      await setZoom(nextZoom);
    }
  }
};

const handleMouseEnter = () => {
  isMouseInside.value = true;
};
const handleMouseLeave = () => {
  isMouseInside.value = false;
};

const onHotspotClick = (item: ChecklistItem) => {
  selectedItem.value = item;
  emit("hotspot-click", item.id);
};

watch(
  () => props.focusedItemId,
  async (id) => {
    if (!id || !cockpitRef.value || scaledW.value <= 0 || scaledH.value <= 0)
      return;
    const item = items.value.find((candidate) => candidate.id === id);
    if (!item || item.x === undefined || item.y === undefined) return;

    selectedItem.value = item;
    isFocused.value = true;

    const targetLeft = (item.x / 100) * scaledW.value - viewportW.value / 2;
    const targetTop = (item.y / 100) * scaledH.value - viewportH.value / 2;
    await nextTick();
    setViewportScroll(targetLeft, targetTop, "smooth");
  },
);

const logPosition = (event: MouseEvent) => {
  if (didDrag || !cockpitRef.value) return;
  const rect = cockpitRef.value
    .querySelector(".image-wrapper")
    ?.getBoundingClientRect();
  if (!rect) return;

  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  if (devMode.value) {
    const current = devItems.value[devIndex.value];
    if (!current) return;
    devCaptured.value = {
      ...devCaptured.value,
      [current.id]: { x: +x.toFixed(2), y: +y.toFixed(2) },
    };
    if (devIndex.value < devItems.value.length - 1) devIndex.value += 1;
    return;
  }

  console.log(`Clicked at X: ${x.toFixed(2)}%, Y: ${y.toFixed(2)}%`);
};

const devMode = ref(false);
const devIndex = ref(0);
const devCaptured = ref<Record<string, { x: number; y: number }>>({});
const devExportOpen = ref(false);
const devExportText = ref("");

interface DevItem extends ChecklistItem {
  phaseId: string;
  phaseLabel: string;
}

const devItems = computed<DevItem[]>(() =>
  flightChecklists.flatMap((phase) =>
    phase.items.map((item) => ({
      ...item,
      phaseId: phase.id,
      phaseLabel: phase.label,
    })),
  ),
);

const devCurrent = computed<DevItem | null>(
  () => devItems.value[devIndex.value] ?? null,
);

const toggleDevMode = () => {
  devMode.value = !devMode.value;
  devExportOpen.value = false;
};

const devPrev = () => {
  if (devIndex.value > 0) devIndex.value -= 1;
};

const devSkip = () => {
  if (devIndex.value < devItems.value.length - 1) devIndex.value += 1;
};

const devTogglePos = ref({ x: 12, y: 12 });
let devToggleDragStart = { mx: 0, my: 0, bx: 0, by: 0 };
let devToggleDidDrag = false;

const onDevToggleMouseMove = (event: MouseEvent) => {
  const dx = event.clientX - devToggleDragStart.mx;
  const dy = event.clientY - devToggleDragStart.my;
  if (!devToggleDidDrag && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
    devToggleDidDrag = true;
  }
  devTogglePos.value = {
    x: devToggleDragStart.bx + dx,
    y: devToggleDragStart.by + dy,
  };
};

const onDevToggleMouseUp = () => {
  window.removeEventListener("mousemove", onDevToggleMouseMove);
  window.removeEventListener("mouseup", onDevToggleMouseUp);
};

const onDevToggleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return;
  devToggleDidDrag = false;
  devToggleDragStart = {
    mx: event.clientX,
    my: event.clientY,
    bx: devTogglePos.value.x,
    by: devTogglePos.value.y,
  };
  window.addEventListener("mousemove", onDevToggleMouseMove);
  window.addEventListener("mouseup", onDevToggleMouseUp);
  event.stopPropagation();
};

const onDevToggleClick = (event: MouseEvent) => {
  if (devToggleDidDrag) {
    devToggleDidDrag = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  toggleDevMode();
};

const onWheel = async (event: WheelEvent) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  isFocused.value = false;
  if (event.deltaY < 0) await setZoom(zoom.value + ZOOM_STEP);
  if (event.deltaY > 0) await setZoom(zoom.value - ZOOM_STEP);
};

const devExport = async () => {
  const grouped: Record<string, Record<string, { x: number; y: number }>> = {};
  for (const item of devItems.value) {
    const coord = devCaptured.value[item.id];
    if (!coord) continue;
    if (!grouped[item.phaseId]) grouped[item.phaseId] = {};
    grouped[item.phaseId][item.id] = coord;
  }
  const json = JSON.stringify(grouped, null, 2);
  devExportText.value = json;
  devExportOpen.value = true;
  try {
    await navigator.clipboard?.writeText(json);
  } catch {
    // Fallback remains the textarea.
  }
};

const hotspotStyle = (item: ChecklistItem) => {
  const xPct = (item.x ?? 0) / 100;
  const yPct = (item.y ?? 0) / 100;

  // Since the image always fills the scene width, we can use scaled dimensions directly.
  const dispW = scaledW.value;
  const dispH = scaledH.value;

  const leftPx = Math.round(xPct * dispW);
  const topPx = Math.round(yPct * dispH);
  return { left: `${leftPx}px`, top: `${topPx}px` };
};

const imgStyle = computed(() => {
  if (scaledW.value <= 0 || scaledH.value <= 0)
    return { width: "100%", height: "100%", objectPosition: "left top" };

  return {
    width: `${Math.round(scaledW.value)}px`,
    height: `${Math.round(scaledH.value)}px`,
    objectPosition: "left top",
  };
});

const devMarkerStyle = (coord: { x: number; y: number }) => {
  const leftPx = ((coord.x ?? 0) / 100) * scaledW.value;
  const topPx = ((coord.y ?? 0) / 100) * scaledH.value;
  return { left: `${leftPx}px`, top: `${topPx}px` };
};
</script>

<template>
  <div
    ref="cockpitRef"
    class="cockpit-viewport"
    :class="{ 'is-dragging': isDragging }"
    @mousedown="onMouseDown"
    @wheel="onWheel"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="cockpit-scene"
      :class="overlayTransitionClass"
      :style="sceneStyle"
    >
      <div class="image-wrapper" ref="imageWrapperRef" @click="logPosition">
        <img
          src="../assets/A320neo-Cockpit.png"
          alt="A320neo Cockpit"
          class="cockpit-img"
          :class="{ 'is-zoomed': zoom > 1 }"
          ref="imgRef"
          :style="imgStyle"
          @load="onImageLoad"
        />

        <div
          class="hotspot-overlay"
          :aria-label="devMode ? 'Dev Mode markers' : 'Checklist hotspots'"
        >
          <template v-if="!devMode">
            <div
              v-for="item in items"
              :key="item.id"
              class="hotspot"
              :class="{ active: focusedItemId === item.id }"
              :style="hotspotStyle(item)"
              @click.stop="onHotspotClick(item)"
            >
              <div class="hotspot-ring" />
              <div class="hotspot-dot" />
              <span class="hotspot-label">{{ item.item }}</span>
            </div>
          </template>

          <template v-if="devMode">
            <div
              v-for="[id, coord] in Object.entries(devCaptured)"
              :key="id"
              class="dev-marker-html"
              :class="{ current: devCurrent?.id === id }"
              :style="devMarkerStyle(coord)"
            />
          </template>
        </div>
      </div>
    </div>

    <div class="zoom-controls" role="group" aria-label="Zoom controls">
      <button
        type="button"
        class="zoom-button"
        aria-label="Zoom out"
        :disabled="zoom <= MIN_ZOOM"
        @mousedown.prevent
        @click="zoomOut($event)"
      >
        -
      </button>
      <button
        type="button"
        class="zoom-button zoom-status"
        aria-label="Reset zoom"
        @mousedown.prevent
        @click="resetZoom($event)"
      >
        {{ Math.round(zoom * 100) }}%
      </button>
      <button
        type="button"
        class="zoom-button"
        aria-label="Zoom in"
        :disabled="zoom >= MAX_ZOOM"
        @mousedown.prevent
        @click="zoomIn($event)"
      >
        +
      </button>
    </div>

    <button
      class="dev-toggle"
      :class="{ active: devMode }"
      :style="{ left: devTogglePos.x + 'px', top: devTogglePos.y + 'px' }"
      @mousedown="onDevToggleMouseDown"
      @click="onDevToggleClick"
    >
      {{ devMode ? "Exit Dev" : "Dev Mode" }}
    </button>

    <div v-if="devMode && devCurrent" class="dev-panel" @mousedown.stop>
      <div class="dev-progress">{{ devIndex + 1 }} / {{ devItems.length }}</div>
      <div class="dev-phase">
        {{ devCurrent.phaseLabel }}
      </div>
      <div class="dev-item">
        {{ devCurrent.item }}
      </div>
      <div class="dev-action">
        {{ devCurrent.action }}
      </div>
      <div class="dev-buttons">
        <button :disabled="devIndex === 0" @click="devPrev">Prev</button>
        <button @click="devSkip">Skip</button>
        <button class="primary" @click="devExport">Export</button>
      </div>
      <textarea
        v-if="devExportOpen"
        class="dev-export"
        readonly
        :value="devExportText"
      />
    </div>

    <div v-if="isMouseInside && !devMode" class="crosshair" />

    <Transition name="fade">
      <div
        v-if="selectedItem"
        class="modal-overlay"
        @click="selectedItem = null"
      >
        <div class="modal-card" @click.stop>
          <button class="close-btn" @click="selectedItem = null">×</button>
          <div class="panel-tag">
            {{ selectedItem.panel.toUpperCase() }}
          </div>
          <h2>{{ selectedItem.item }}</h2>
          <div class="action-required">
            Action: <span>{{ selectedItem.action }}</span>
          </div>
          <p>{{ selectedItem.description }}</p>
          <div class="modal-footer">
            <button class="btn-primary" @click="selectedItem = null">
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
  overflow: auto;
  background:
    radial-gradient(circle at top, rgba(47, 61, 73, 0.35), transparent 48%),
    #050505;
  cursor: grab;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  touch-action: pan-x pan-y;
  /* Prevent large gap at the bottom */
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.cockpit-viewport::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.cockpit-viewport::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}

.cockpit-viewport.is-dragging {
  cursor: grabbing;
}

.cockpit-scene {
  position: relative;
  /* Allow the scene size to be driven purely by the scaled image
     dimensions. Prevent flex min-size behaviour from forcing the scene
     to be at least the viewport width which creates letterbox gaps when
     the scaled image is narrower than the viewport. */
  min-width: 0;
  min-height: 0;
  flex: 0 0 auto;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  /* Allow the image to overflow visually when explicitly sized (zoomed)
     so the parent .cockpit-viewport can provide scrollbars. */
  overflow: visible;
}

.cockpit-img {
  display: block;
  width: 100%;
  height: 100%;
  /* Ensure the image aligns to the top-left so hotspots (pixel-calculated)
     map correctly regardless of letterboxing/contain behavior */
  object-position: left top;
  user-select: none;
  pointer-events: auto;
  box-shadow: 0 0 100px rgba(0, 0, 0, 0.8);
}

.cockpit-img.is-zoomed {
  /* Prevent downstream image constraints (e.g. max-width) from limiting
     the visual zoom. */
  max-width: none;
  max-height: none;
  /* Position absolutely within the wrapper so explicit pixel sizing will
     overflow the wrapper and be scrolled by the viewport container. */
  position: absolute;
  top: 0;
  left: 0;
}

.hotspot-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.hotspot {
  position: absolute;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  pointer-events: auto;
}

.hotspot-ring {
  position: absolute;
  inset: -6px;
  border: 1.5px solid rgba(255, 152, 0, 0.85);
  background: rgba(255, 152, 0, 0.1);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.hotspot-dot {
  position: absolute;
  inset: 2px;
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

.zoom-controls {
  position: sticky;
  top: 12px;
  right: 12px;
  z-index: 140;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: fit-content;
  align-self: flex-start;
  margin-left: auto;
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
  cursor: not-allowed;
}

.zoom-status {
  min-width: 76px;
  font-size: 13px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: #1a1e23;
  width: min(400px, calc(100vw - 32px));
  padding: 30px;
  border-radius: 12px;
  position: relative;
  border: 1px solid #444;
  color: #ddd;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
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

h2 {
  margin: 0 0 10px 0;
  color: #fff;
  font-size: 22px;
}

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

p {
  line-height: 1.6;
  font-size: 15px;
  color: #bbb;
}

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.crosshair {
  position: sticky;
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

.dev-toggle {
  position: absolute;
  z-index: 150;
  background: rgba(20, 24, 28, 0.9);
  color: #ff9800;
  border: 1px solid #ff9800;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1px;
  border-radius: 4px;
  cursor: pointer;
}

.dev-toggle.active {
  background: #ff9800;
  color: #000;
}

.dev-panel {
  position: absolute;
  top: 64px;
  left: 12px;
  z-index: 150;
  width: 260px;
  background: rgba(20, 24, 28, 0.95);
  border: 1px solid #333;
  border-radius: 6px;
  padding: 12px;
  color: #ddd;
  font-size: 13px;
}

.dev-progress {
  color: #888;
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.dev-phase {
  color: #4caf50;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
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

.dev-buttons {
  display: flex;
  gap: 6px;
}

.dev-buttons button {
  flex: 1;
  background: #2a2e33;
  color: #ddd;
  border: 1px solid #444;
  padding: 6px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.dev-buttons button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dev-buttons button.primary {
  background: #ff9800;
  color: #000;
  border-color: #ff9800;
}

.dev-export {
  width: 100%;
  height: 160px;
  margin-top: 10px;
  background: #0d0f11;
  color: #9f9;
  border: 1px solid #333;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  padding: 6px;
  resize: vertical;
  box-sizing: border-box;
}

.dev-marker-html {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #4caf50;
  border: 1px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.dev-marker-html.current {
  background: #ff9800;
  width: 6px;
  height: 6px;
  z-index: 2;
}

.cockpit-viewport::after {
  content: "";
  position: sticky;
  left: 0;
  top: 0;
  display: block;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle,
    transparent 42%,
    rgba(0, 0, 0, 0.38) 100%
  );
  pointer-events: none;
}

@media (max-width: 900px) {
  .zoom-controls {
    top: 10px;
    right: 10px;
    gap: 6px;
    margin-top: 10px;
    margin-right: 10px;
  }

  .zoom-button {
    min-width: 40px;
    height: 40px;
  }

  .dev-panel {
    width: min(260px, calc(100vw - 24px));
  }
}
</style>
