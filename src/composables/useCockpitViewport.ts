import { ref, computed, type Ref, nextTick } from 'vue';

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
 */
export function useCockpitViewport(
  cockpitRef: Ref<HTMLElement | null>,
  isMobile: Ref<boolean>
) {
  // --- Reactive State ---
  const zoom = ref(1);
  const viewportW = ref(0);
  const viewportH = ref(0);
  const imageNaturalW = ref(0);
  const imageNaturalH = ref(0);

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

  const scaledW = computed(() => Math.round(imageNaturalW.value * baseScale.value * zoom.value));
  const scaledH = computed(() => Math.round(imageNaturalH.value * baseScale.value * zoom.value));

  // --- Methods ---

  /**
   * Clamp a value between min and max.
   */
  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  /**
   * Set viewport scroll position with clamping.
   */
  const setViewportScroll = (
    left: number, 
    top: number, 
    behavior: ScrollBehavior = 'auto'
  ) => {
    if (!cockpitRef.value) return;
    
    const maxLeft = Math.max(0, scaledW.value - viewportW.value);
    const maxTop = Math.max(0, scaledH.value - viewportH.value);
    
    const nextLeft = clamp(left, 0, maxLeft);
    const nextTop = clamp(top, 0, maxTop);
    
    cockpitRef.value.scrollTo({
      left: nextLeft,
      top: nextTop,
      behavior,
    });
  };

  /**
   * Update zoom level while keeping a focal point stationary.
   */
  const setZoom = async (
    nextZoom: number,
    focal?: { clientX: number; clientY: number }
  ) => {
    if (!cockpitRef.value || scaledW.value <= 0 || scaledH.value <= 0) {
      zoom.value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM.value);
      return;
    }

    let widthRatio: number;
    let heightRatio: number;

    const rect = cockpitRef.value.getBoundingClientRect();
    if (focal) {
      // Zoom toward the mouse/finger position
      const fx = focal.clientX - rect.left;
      const fy = focal.clientY - rect.top;
      widthRatio = clamp(fx / Math.max(1, rect.width), 0, 1);
      heightRatio = clamp(fy / Math.max(1, rect.height), 0, 1);
    } else {
      // Zoom toward the center of the current viewport
      const currentCenterX = cockpitRef.value.scrollLeft + viewportW.value / 2;
      const currentCenterY = cockpitRef.value.scrollTop + viewportH.value / 2;
      widthRatio = currentCenterX / scaledW.value;
      heightRatio = currentCenterY / scaledH.value;
    }

    zoom.value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM.value);
    
    // Wait for Vue to update the DOM (and the scene dimensions) before scrolling
    await nextTick();

    const nextCenterX = widthRatio * scaledW.value;
    const nextCenterY = heightRatio * scaledH.value;
    
    setViewportScroll(
      nextCenterX - viewportW.value / 2,
      nextCenterY - viewportH.value / 2
    );
  };

  /**
   * Pan the viewport to a specific % coordinate.
   */
  const scrollToCoord = (xPct: number, yPct: number, behavior: ScrollBehavior = 'smooth') => {
    const targetLeft = (xPct / 100) * scaledW.value - viewportW.value / 2;
    const targetTop = (yPct / 100) * scaledH.value - viewportH.value / 2;
    setViewportScroll(targetLeft, targetTop, behavior);
  };

  return {
    zoom,
    scaledW,
    scaledH,
    MIN_ZOOM,
    MAX_ZOOM,
    setZoom,
    scrollToCoord,
    setViewportScroll,
    updateDimensions: (w: number, h: number, imgW: number, imgH: number) => {
      viewportW.value = w;
      viewportH.value = h;
      imageNaturalW.value = imgW;
      imageNaturalH.value = imgH;
    }
  };
}
