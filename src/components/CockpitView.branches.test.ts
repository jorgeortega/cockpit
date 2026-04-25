import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CockpitView from './CockpitView.vue';
import { DEFAULT_PHASE_ID } from '../data/checklist';

describe('CockpitView branch coverage helpers', () => {
  it('exercise drag, dev toggle, and dev mode logic', async () => {
    const wrapper = mount(CockpitView, { props: { activePhaseId: DEFAULT_PHASE_ID, focusedItemId: null }, attachTo: document.body });

    // Stub bounding rect for viewport sizing
    const el = wrapper.find('.cockpit-viewport').element as HTMLElement;
    el.getBoundingClientRect = () => ({ width: 800, height: 600, left: 0, top: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON() { return null; } });

    // Stub image wrapper rect
    const wrapperEl = wrapper.find('.image-wrapper').element as HTMLElement;
    wrapperEl.getBoundingClientRect = () => ({ width: 1000, height: 800, left: 0, top: 0, right: 1000, bottom: 800, x: 0, y: 0, toJSON() { return null; } });

    // Trigger image load to set sizes
    await (wrapper.vm as any).onImageLoad({ target: { naturalWidth: 1000, naturalHeight: 800 } } as any);

    // Simulate mouse drag sequence
    await (wrapper.vm as any).onMouseDown({ button: 0, clientX: 10, clientY: 10, target: document.body, preventDefault() {} });
    // Move pointer
    await (wrapper.vm as any).onWindowMouseMove({ clientX: 30, clientY: 35 });
    // Release
    await (wrapper.vm as any).onWindowMouseUp();

    // Toggle dev mode
    await (wrapper.vm as any).toggleDevMode();
    expect((wrapper.vm as any).devMode).toBe(true);

    // Reset didDrag for logPosition test (simulating a mouse down that doesn't drag)
    await (wrapper.vm as any).onMouseDown({ button: 0, clientX: 500, clientY: 400, target: document.body, preventDefault() {} });

    // Log position in dev mode
    await (wrapper.vm as any).logPosition({ clientX: 500, clientY: 400 });
    expect((wrapper.vm as any).devClickedCoord).toEqual({ x: 50, y: 50 });

    wrapper.unmount();
  });

  it('exercises ResizeObserver callback and scroll fallbacks', async () => {
    let callback: any;
    const mockObserver = vi.fn().mockImplementation((cb) => {
      callback = cb;
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };
    });
    vi.stubGlobal('ResizeObserver', mockObserver);

    const wrapper = mount(CockpitView, { 
      props: { activePhaseId: DEFAULT_PHASE_ID, focusedItemId: null },
      attachTo: document.body 
    });
    
    // Set internal state to allow non-zero scrolling
    (wrapper.vm as any).viewportW = 1000;
    (wrapper.vm as any).viewportH = 1000;
    (wrapper.vm as any).imageNaturalW = 4000;
    (wrapper.vm as any).imageNaturalH = 2000;
    // zoom=1, baseScale = 1000/4000 = 0.25. scaledW = 1000.
    // maxLeft = 1000 - 1000 = 0. Still 0.
    // Let's set zoom higher.
    (wrapper.vm as any).zoom = 2; // scaledW = 2000. maxLeft = 1000.
    
    // Exercise ResizeObserver callback
    callback([{ contentRect: { width: 900, height: 700 } }]);

    // Exercise scrollTo fallback (catch block)
    const viewport = wrapper.find('.cockpit-viewport').element as any;
    viewport.scrollTo = () => { throw new Error('fail'); };
    await (wrapper.vm as any).setViewportScroll(10, 10);
    expect(viewport.scrollLeft).toBe(10);

    // Exercise scrollTo missing (else block)
    viewport.scrollTo = undefined;
    await (wrapper.vm as any).setViewportScroll(20, 20);
    expect(viewport.scrollLeft).toBe(20);

    // Exercise zoom methods without events (covers event?.currentTarget branch)
    await (wrapper.vm as any).zoomIn();
    await (wrapper.vm as any).zoomOut();
    await (wrapper.vm as any).resetZoom();

    // Exercise onTouchMove with non-cancelable event
    const nonCancelableEvent = {
      touches: [{ clientX: 10, clientY: 10 }, { clientX: 20, clientY: 20 }],
      cancelable: false,
      preventDefault: vi.fn(),
    } as any;
    await (wrapper.vm as any).onTouchMove(nonCancelableEvent);
    expect(nonCancelableEvent.preventDefault).not.toHaveBeenCalled();

    // Exercise hotspotStyle with missing x/y
    const style = (wrapper.vm as any).hotspotStyle({ item: 'test', action: 'test', panel: 'none' });
    expect(style.left).toBe('0px');

    // Exercise logPosition with missing rect
    const querySpy = vi.spyOn(viewport, 'querySelector').mockReturnValue(null);
    await (wrapper.vm as any).logPosition({ clientX: 100, clientY: 100 });
    querySpy.mockRestore();

    // Exercise devClosestItem when null
    (wrapper.vm as any).devClickedCoord = null;
    expect((wrapper.vm as any).devClosestItem).toBeNull();

    // Exercise onWindowMouseMove when already dragging
    (wrapper.vm as any).isDragging = true;
    (wrapper.vm as any).didDrag = true;
    await (wrapper.vm as any).onWindowMouseMove({ clientX: 100, clientY: 100 });

    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it('exercises img complete branch on mount', async () => {
    // Mock Image prototype properties so that any NEW image created will have these.
    const prototype = HTMLImageElement.prototype;
    const originalComplete = Object.getOwnPropertyDescriptor(prototype, 'complete');
    const originalNaturalWidth = Object.getOwnPropertyDescriptor(prototype, 'naturalWidth');
    const originalNaturalHeight = Object.getOwnPropertyDescriptor(prototype, 'naturalHeight');

    Object.defineProperty(prototype, 'complete', { value: true, configurable: true });
    Object.defineProperty(prototype, 'naturalWidth', { value: 1000, configurable: true });
    Object.defineProperty(prototype, 'naturalHeight', { value: 800, configurable: true });

    const wrapper = mount(CockpitView, { 
      props: { activePhaseId: DEFAULT_PHASE_ID, focusedItemId: null },
      attachTo: document.body 
    });

    expect((wrapper.vm as any).imageNaturalW).toBe(1000);

    wrapper.unmount();

    // Restore originals
    if (originalComplete) Object.defineProperty(prototype, 'complete', originalComplete);
    if (originalNaturalWidth) Object.defineProperty(prototype, 'naturalWidth', originalNaturalWidth);
    if (originalNaturalHeight) Object.defineProperty(prototype, 'naturalHeight', originalNaturalHeight);
  });
});
