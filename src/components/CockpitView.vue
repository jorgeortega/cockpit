<script setup lang="ts">
/**
 * CockpitView — interactive cockpit photo with pan plus per-item
 * hotspots.
 *
 * Responsibilities:
 *   - Render the A320neo cockpit image.
 *   - Overlay a "hotspot" marker for every checklist item in the active flight
 *     phase.
 *   - Pan the image via click-and-drag, or toward a programmatically focused
 *     item when the parent requests one.
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { flightChecklists, getPhaseById, type ChecklistItem } from '../data/checklist';

// --- Props ------------------------------------------------------------------
// `activePhaseId` selects which hotspots are shown.
// `focusedItemId` triggers a programmatic pan/zoom toward that item.
const props = defineProps<{
  activePhaseId: string;
  focusedItemId: string | null;
}>();

// --- Local state ------------------------------------------------------------
const cockpitRef = ref<HTMLElement | null>(null);

// Pan position stored normalised (0..1) relative to the overflow region.
// 0 = show left/top edge; 1 = show right/bottom edge. Normalising keeps the
// pan math independent of viewport size and the focused-jump watch can write
// directly to it regardless of current image scale.
const mouseX = ref(0.5);
const mouseY = ref(0.5);

// Item shown in the detail modal, or `null` when the modal is closed.
const selectedItem = ref<ChecklistItem | null>(null);

// `true` while a programmatic "jump to item" transition is playing. Flipped
// back to `false` by any user drag so the user can always regain free panning.
const isFocused = ref(false);

// Drives the crosshair overlay — only rendered while the cursor is inside.
const isMouseInside = ref(false);

// `true` while the user is holding the mouse button to drag. Drives the
// grabbing cursor and gates the window-level mousemove handler.
const isDragging = ref(false);

// Runtime viewport and image-natural dimensions. Needed to compute the
// cover-fit scale (no fixed 1.5× multiplier any more). Kept in refs so the
// computed pan style recomputes when either the container or the image loads.
const viewportW = ref(0);
const viewportH = ref(0);
const imageNaturalW = ref(0);
const imageNaturalH = ref(0);

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
  // Re-measure on load: the initial onMounted read can fire before the
  // browser has a final layout (e.g. fonts, sidebar width). Keeps pan math
  // correct on first frame.
  updateViewportSize();
};

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  updateViewportSize();
  if (cockpitRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(cockpitRef.value);
  }
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  // Detach window listeners if unmount happens mid-drag.
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup', onWindowMouseUp);
  window.removeEventListener('mousemove', onDevToggleMouseMove);
  window.removeEventListener('mouseup', onDevToggleMouseUp);
});

// --- Derived data -----------------------------------------------------------
// Items for the current phase. Resolved via a helper so the lookup rule lives
// in exactly one place (`data/checklist.ts`). `?? []` keeps `v-for` safe if
// the parent ever passes an unknown phase id.
const items = computed<ChecklistItem[]>(
  () => getPhaseById(props.activePhaseId)?.items ?? [],
);

// --- Drag panning -----------------------------------------------------------
// Pan is driven by click-and-drag. Press records the anchor (pointer + pan
// snapshot); movement translates pointer delta into normalised pan delta so
// the dragged point stays pinned under the cursor. Window listeners (not
// viewport listeners) ensure the drag continues if the cursor leaves the
// viewport — standard behaviour for scrollable/draggable surfaces.
let dragStartX = 0;
let dragStartY = 0;
let dragStartMouseX = 0;
let dragStartMouseY = 0;
// Tracks whether the press turned into a real drag (moved past the threshold).
// Used to suppress the follow-up click — otherwise a drag that ends on top of
// the image wrapper would fire `logPosition`.
let didDrag = false;
const DRAG_THRESHOLD_PX = 3;

const onWindowMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return;
  const overflowX = Math.max(0, scaledW.value - viewportW.value);
  const overflowY = Math.max(0, scaledH.value - viewportH.value);
  const dx = event.clientX - dragStartX;
  const dy = event.clientY - dragStartY;
  if (!didDrag && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
    didDrag = true;
  }
  // Dragging right reveals content on the left — pan position decreases.
  // Division by overflow maps pixel delta into normalised space; when the
  // image exactly fits (overflow = 0) the axis is pinned.
  const nx = overflowX > 0 ? dragStartMouseX - dx / overflowX : dragStartMouseX;
  const ny = overflowY > 0 ? dragStartMouseY - dy / overflowY : dragStartMouseY;
  mouseX.value = Math.max(0, Math.min(1, nx));
  mouseY.value = Math.max(0, Math.min(1, ny));
};

const onWindowMouseUp = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup', onWindowMouseUp);
};

const onMouseDown = (event: MouseEvent) => {
  // Only the primary button initiates a drag. Right-click / middle-click
  // should fall through to native behaviour.
  if (event.button !== 0) return;
  // Hotspots and the modal own their own click semantics; do not start a
  // drag on top of them.
  const target = event.target as HTMLElement | null;
  if (target?.closest('.hotspot, .modal-overlay, .dev-toggle, .dev-panel')) return;

  isDragging.value = true;
  didDrag = false;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartMouseX = mouseX.value;
  dragStartMouseY = mouseY.value;
  // Any user drag cancels the "focused item" lock so the user can regain
  // free panning from wherever the jump landed.
  isFocused.value = false;
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', onWindowMouseUp);
  // Prevent browser image/text drag from hijacking the gesture.
  event.preventDefault();
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
//
// In dev mode the same click, instead of logging, captures the coordinate
// for the currently prompted checklist item and advances to the next one.
const logPosition = (e: MouseEvent) => {
  // A drag that ends on the image wrapper also fires `click`; ignore those
  // so the dev helper only logs genuine taps.
  if (didDrag) return;
  if (!cockpitRef.value) return;
  const rect = cockpitRef.value
    .querySelector('.image-wrapper')
    ?.getBoundingClientRect();
  if (!rect) return;
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

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

// --- Dev mode ---------------------------------------------------------------
// Sequential hotspot-capture workflow. Toggle on from the top-left button;
// the panel names the next item to click. Each non-drag click on the image
// captures (x, y) in percent for that item and advances to the next. Export
// produces a JSON blob (copied to clipboard when available) that can be
// pasted back into `checklist.ts`.
const devMode = ref(false);
const devIndex = ref(0);
const devCaptured = ref<Record<string, { x: number; y: number }>>({});
const devExportOpen = ref(false);
const devExportText = ref('');

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

// --- Dev toggle drag --------------------------------------------------------
// The dev button can sit on top of a cockpit control the user wants to click,
// so it's draggable. Position is tracked in viewport-pixel offsets from the
// top-left. A press that moves past the threshold sets the drag flag and the
// subsequent click is swallowed to avoid toggling dev mode accidentally.
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
  window.removeEventListener('mousemove', onDevToggleMouseMove);
  window.removeEventListener('mouseup', onDevToggleMouseUp);
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
  window.addEventListener('mousemove', onDevToggleMouseMove);
  window.addEventListener('mouseup', onDevToggleMouseUp);
  // Stop the press bubbling up to the viewport drag handler.
  event.stopPropagation();
};

const onDevToggleClick = (event: MouseEvent) => {
  // Click tail of a drag: suppress toggle, consume the click.
  if (devToggleDidDrag) {
    devToggleDidDrag = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  toggleDevMode();
};

// --- Wheel panning ----------------------------------------------------------
// Scroll wheel / two-finger trackpad pan the image. deltaY maps to Y-axis by
// default; Shift+wheel maps deltaY to X (standard browser convention for
// horizontal scroll). Positive deltaY scrolls "down" → reveals content below
// → pan position increases.
const onWheel = (event: WheelEvent) => {
  const overflowX = Math.max(0, scaledW.value - viewportW.value);
  const overflowY = Math.max(0, scaledH.value - viewportH.value);
  if (overflowX <= 0 && overflowY <= 0) return;
  event.preventDefault();
  isFocused.value = false;
  const dx = event.shiftKey ? event.deltaY : event.deltaX;
  const dy = event.shiftKey ? 0 : event.deltaY;
  if (overflowX > 0 && dx !== 0) {
    mouseX.value = Math.max(0, Math.min(1, mouseX.value + dx / overflowX));
  }
  if (overflowY > 0 && dy !== 0) {
    mouseY.value = Math.max(0, Math.min(1, mouseY.value + dy / overflowY));
  }
};

const devExport = async () => {
  // Group captured coords back under their phase so the output mirrors the
  // shape of `flightChecklists` and is easy to diff against the source.
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
    // Clipboard may be unavailable (insecure context, denied permission).
    // The textarea is the fallback — user can select-all and copy manually.
  }
};

// --- Pan style --------------------------------------------------------------
// Fixed display scale: the source asset is ~7K×12K so cover-fit renders it
// tiny on most displays. Rendering at 0.5× natural keeps detail readable
// while leaving room for pan.
//
//   scaled(W|H)   = natural(W|H) * IMAGE_SCALE
//   overflow(X|Y) = scaled(W|H) - viewport(W|H)
//     — hidden pixels available for panning. Negative means the image is
//       smaller than the viewport in that axis and should be letterboxed
//       (centered with no pan).
//   pan(X|Y) = mouse(X|Y) * overflow(X|Y)    // if overflow > 0
//            = overflow(X|Y) / 2              // else, centers the image
//
// Falls back to a passthrough style while image / viewport dimensions have
// not yet been measured. Avoids a first-paint jump.
const IMAGE_SCALE = 0.5;

const scaledW = computed(() => imageNaturalW.value * IMAGE_SCALE);
const scaledH = computed(() => imageNaturalH.value * IMAGE_SCALE);

const cockpitStyle = computed(() => {
  const ready =
    scaledW.value > 0 && scaledH.value > 0 &&
    viewportW.value > 0 && viewportH.value > 0;
  if (!ready) {
    return {
      width: '100%',
      height: '100%',
      transform: 'translate(0px, 0px)',
      transition: 'transform 0.15s ease-out',
    };
  }
  const overflowX = scaledW.value - viewportW.value;
  const overflowY = scaledH.value - viewportH.value;
  const panX = overflowX > 0 ? mouseX.value * overflowX : overflowX / 2;
  const panY = overflowY > 0 ? mouseY.value * overflowY : overflowY / 2;
  return {
    width: `${scaledW.value}px`,
    height: `${scaledH.value}px`,
    transform: `translate(${-panX}px, ${-panY}px)`,
    transition: isFocused.value
      ? 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)' // slower ease for programmatic jumps
      : isDragging.value
        ? 'none'                                    // 1:1 with cursor while dragging
        : 'transform 0.15s ease-out',               // brief ease when settling
  };
});
</script>

<template>
  <div
    ref="cockpitRef"
    class="cockpit-viewport"
    :class="{ 'is-dragging': isDragging }"
    @mousedown="onMouseDown"
    @wheel.prevent="onWheel"
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
          @load="onImageLoad"
        >

        <!-- Hotspots: one marker per item in the active phase. Hidden in
             dev mode so the capture click is not intercepted. -->
        <template v-if="!devMode">
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
        </template>

        <!-- Dev mode: preview markers for coords captured so far. Purely
             visual — clicks fall through to the wrapper so users can
             recapture an item by clicking a new spot. -->
        <template v-if="devMode">
          <div
            v-for="[id, coord] in Object.entries(devCaptured)"
            :key="id"
            class="dev-marker"
            :class="{ current: devCurrent?.id === id }"
            :style="{ left: coord.x + '%', top: coord.y + '%' }"
          />
        </template>
      </div>
    </div>

    <!-- Dev mode toggle + guidance panel. Fixed to the viewport's top-left
         so it stays visible while the user pans. -->
    <button
      class="dev-toggle"
      :class="{ active: devMode }"
      :style="{ left: devTogglePos.x + 'px', top: devTogglePos.y + 'px' }"
      @mousedown="onDevToggleMouseDown"
      @click="onDevToggleClick"
    >
      {{ devMode ? 'Exit Dev' : 'Dev Mode' }}
    </button>

    <div
      v-if="devMode && devCurrent"
      class="dev-panel"
      @mousedown.stop
    >
      <div class="dev-progress">
        {{ devIndex + 1 }} / {{ devItems.length }}
      </div>
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
        <button
          :disabled="devIndex === 0"
          @click="devPrev"
        >
          Prev
        </button>
        <button @click="devSkip">
          Skip
        </button>
        <button
          class="primary"
          @click="devExport"
        >
          Export
        </button>
      </div>
      <textarea
        v-if="devExportOpen"
        class="dev-export"
        readonly
        :value="devExportText"
      />
    </div>

    <div
      v-if="isMouseInside && !devMode"
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
  cursor: grab;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.cockpit-viewport.is-dragging {
  cursor: grabbing;
}

/*
 * Cover-fit pan container.
 *
 * Width/height come from `cockpitStyle` (the cover-scaled image dimensions
 * in pixels) so the image fills 100% of the viewport in both axes at 1×
 * with no additional CSS scaling. Transform is a translate() only — no
 * scale — and is applied from the top-left origin so pan math lines up
 * with `mouseX * overflowX`. Cursor is placed at (0,0) logically by
 * anchoring the transform origin at the same corner.
 */
.cockpit-image-container {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.cockpit-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover; /* Belt-and-braces: wrapper is already the cover size. */
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

.dev-toggle {
  position: absolute;
  top: 12px;
  left: 12px;
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
  top: 52px;
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
  color: #4CAF50;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.dev-item { color: #fff; font-weight: bold; margin-bottom: 4px; }

.dev-action {
  color: #ff9800;
  font-size: 12px;
  margin-bottom: 10px;
}

.dev-buttons { display: flex; gap: 6px; }

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

.dev-marker {
  position: absolute;
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%);
  border: 2px solid #4CAF50;
  border-radius: 50%;
  background: rgba(76, 175, 80, 0.3);
  pointer-events: none;
  z-index: 9;
}

.dev-marker.current {
  border-color: #ff9800;
  background: rgba(255, 152, 0, 0.4);
  box-shadow: 0 0 12px #ff9800;
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
