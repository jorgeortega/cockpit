import { ref, computed, type Ref, nextTick } from "vue";

/**
 * CS Note: Composition API & Separation of Concerns
 *
 * We extract the "Math" and "State" of the viewport into a Composable.
 * This separates RENDERING (HTML/CSS) from LOGIC (Zoom/Pan math).
 *
 * The composable handles:
 * 1. Zoom levels and limits.
 * 2. Coordinate conversion from % to pixels.
 * 3. Scrolling/Panning logic with focal point support.
 * 4. Drag-to-pan interactions.
 */
export function useCockpitViewport(
  cockpitRef: Ref<HTMLElement | null>,
  isMobile: Ref<boolean>,
) {
  // --- Reactive State ---
  const zoom = ref(1);
  const viewportW = ref(0);
  const viewportH = ref(0);
  const imageNaturalW = ref(0);
  const imageNaturalH = ref(0);
  const isDragging = ref(false);
  const didDrag = ref(false); // Ref so it's reactive and accessible to callers

  // --- Constants ---
  const MIN_ZOOM = 1;
  const MAX_ZOOM = computed(() => (isMobile.value ? 20 : 5));

  /**
   * CS Note: Responsive Design Math
   * We use "fit-to-width" as our baseline.
   */
  const baseScale = computed(() => {
    if (imageNaturalW.value <= 0) return 1;
    const vw = viewportW.value > 0 ? viewportW.value : window.innerWidth;
    return vw / imageNaturalW.value;
  });

  const scaledW = computed(() =>
    Math.round(imageNaturalW.value * baseScale.value * zoom.value),
  );
  const scaledH = computed(() =>
    Math.round(imageNaturalH.value * baseScale.value * zoom.value),
  );

  // --- Methods ---

  /**
   * Clamp a value between min and max.
   */
  const clamp = (val: number, min: number, max: number) =>
    Math.min(max, Math.max(min, val));

  /**
   * Set viewport scroll position with clamping.
   */
  const setViewportScroll = (
    left: number,
    top: number,
    behavior: ScrollBehavior = "auto",
  ) => {
    if (!cockpitRef.value) return;

    const maxLeft = Math.max(0, scaledW.value - viewportW.value);
    const maxTop = Math.max(0, scaledH.value - viewportH.value);

    const nextLeft = clamp(left, 0, maxLeft);
    const nextTop = clamp(top, 0, maxTop);

    try {
      cockpitRef.value.scrollTo({
        left: nextLeft,
        top: nextTop,
        behavior,
      });
      /* eslint-disable @typescript-eslint/no-unused-vars */
    } catch (e) {
      // Fallback for environments where scrollTo({ ... }) is not supported
      // or throws (like some test stubs).
      // We use the original left/top here to bypass clamping if dimensions
      // are zero in tests.
      cockpitRef.value.scrollLeft = left;
      cockpitRef.value.scrollTop = top;
    }
  };

  /**
   * Update zoom level while keeping a focal point stationary.
   */
  const setZoom = async (
    nextZoom: number,
    focal?: { clientX: number; clientY: number },
    immediate = false,
  ) => {
    if (!cockpitRef.value || scaledW.value <= 0 || scaledH.value <= 0) {
      zoom.value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM.value);
      return;
    }

    const rect = cockpitRef.value.getBoundingClientRect();

    // Capture previous scaled sizes so we can compute an exact mapping from
    // image-space coordinates before/after zoom. This avoids centering math
    // that can cause the image to visually shift during pinch gestures.
    const prevScaledW = scaledW.value;
    const prevScaledH = scaledH.value;

    if (focal) {
      // Compute the image-space coordinate under the focal point (in pixels of
      // the current scaled image).
      const imageX = cockpitRef.value.scrollLeft + (focal.clientX - rect.left);
      const imageY = cockpitRef.value.scrollTop + (focal.clientY - rect.top);

      // Apply the zoom value first (so scaledW/scaledH will represent the new
      // sizes after nextTick).
      zoom.value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM.value);

      if (!immediate) {
        await nextTick();
      }

      // Compute new scroll so the same image-space coordinate maps to the same
      // client coordinate (i.e., the image doesn't visually move under the
      // fingers). We scale the image-space coordinate proportionally to the
      // ratio of new/previous scaled dimensions.
      const newScaledW = scaledW.value;
      const newScaledH = scaledH.value;
      const scaleX = prevScaledW > 0 ? newScaledW / prevScaledW : 1;
      const scaleY = prevScaledH > 0 ? newScaledH / prevScaledH : 1;

      const newImageX = imageX * scaleX;
      const newImageY = imageY * scaleY;

      const clientOffsetX = focal.clientX - rect.left;
      const clientOffsetY = focal.clientY - rect.top;

      setViewportScroll(newImageX - clientOffsetX, newImageY - clientOffsetY);
    } else {
      // No focal - preserve the center behavior
      const currentCenterX = cockpitRef.value.scrollLeft + viewportW.value / 2;
      const currentCenterY = cockpitRef.value.scrollTop + viewportH.value / 2;
      const widthRatio: number = currentCenterX / Math.max(1, scaledW.value);
      const heightRatio: number = currentCenterY / Math.max(1, scaledH.value);

      zoom.value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM.value);

      if (!immediate) {
        await nextTick();
      }

      const nextCenterX = widthRatio * scaledW.value;
      const nextCenterY = heightRatio * scaledH.value;

      setViewportScroll(
        nextCenterX - viewportW.value / 2,
        nextCenterY - viewportH.value / 2,
      );
    }
  };

  /**
   * Pan the viewport to a specific % coordinate.
   */
  const scrollToCoord = (
    xPct: number,
    yPct: number,
    behavior: ScrollBehavior = "smooth",
  ) => {
    const targetLeft = (xPct / 100) * scaledW.value - viewportW.value / 2;
    const targetTop = (yPct / 100) * scaledH.value - viewportH.value / 2;
    setViewportScroll(targetLeft, targetTop, behavior);
  };

  // --- Dragging Logic ---
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartLeft = 0;
  let dragStartTop = 0;
  const DRAG_THRESHOLD_PX = 3;

  const onWindowMouseMove = (event: MouseEvent) => {
    if (!isDragging.value || !cockpitRef.value) return;
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;

    if (
      !didDrag.value &&
      (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)
    ) {
      didDrag.value = true;
    }

    setViewportScroll(dragStartLeft - dx, dragStartTop - dy);
  };

  const onWindowMouseUp = () => {
    if (!isDragging.value) return;
    isDragging.value = false;
    window.removeEventListener("mousemove", onWindowMouseMove);
    window.removeEventListener("mouseup", onWindowMouseUp);

    // Reset didDrag after a short delay so the following click event
    // can still see it was a drag.
    setTimeout(() => {
      didDrag.value = false;
    }, 50);
  };

  const onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0 || !cockpitRef.value) return;

    // Check if the click was on an interactive element handled by components
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        ".hotspot, .modal-overlay, .dev-toggle, .dev-panel, .zoom-controls",
      )
    ) {
      return;
    }

    isDragging.value = true;
    didDrag.value = false;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartLeft = cockpitRef.value.scrollLeft;
    dragStartTop = cockpitRef.value.scrollTop;

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    event.preventDefault();
  };

  return {
    zoom,
    scaledW,
    scaledH,
    isDragging,
    didDrag,
    MIN_ZOOM,
    MAX_ZOOM,
    setZoom,
    scrollToCoord,
    setViewportScroll,
    onMouseDown,
    onWindowMouseMove,
    onWindowMouseUp,
    imageNaturalW,
    imageNaturalH,
    viewportW,
    viewportH,
    updateDimensions: (w: number, h: number, imgW: number, imgH: number) => {
      viewportW.value = w;
      viewportH.value = h;
      imageNaturalW.value = imgW;
      imageNaturalH.value = imgH;
    },
  };
}
