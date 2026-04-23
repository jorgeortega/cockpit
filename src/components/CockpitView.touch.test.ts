import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CockpitView from './CockpitView.vue';
import { DEFAULT_PHASE_ID } from '../data/checklist';

describe('CockpitView touch and wheel interactions', () => {
  it('handles pinch-to-zoom and wheel zoom without throwing', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: DEFAULT_PHASE_ID, focusedItemId: null },
      attachTo: document.body,
    });

    // Stub bounding rect so viewport dimensions are non-zero
    const el = wrapper.element as HTMLElement;
    el.getBoundingClientRect = () => ({
      width: 800,
      height: 600,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON() { return null; }
    });

    // Call onImageLoad directly with a synthetic event to set natural sizes
    await (wrapper.vm as any).onImageLoad({ target: { naturalWidth: 2000, naturalHeight: 1000 } } as any);

    // Call touch handlers directly to simulate a pinch gesture
    // Start pinch (two touches)
    await (wrapper.vm as any).onTouchStart({ touches: [{ clientX: 10, clientY: 10 }, { clientX: 30, clientY: 10 }] });

    // Move pinch apart to zoom in
    await (wrapper.vm as any).onTouchMove({ touches: [{ clientX: 5, clientY: 10 }, { clientX: 50, clientY: 10 }], cancelable: false });

    // Simulate ctrl+wheel zoom in/out by calling handler directly
    await (wrapper.vm as any).onWheel({ deltaY: -100, ctrlKey: true, preventDefault() {}, cancelable: true });
    await (wrapper.vm as any).onWheel({ deltaY: 100, ctrlKey: true, preventDefault() {}, cancelable: true });

    // Expect zoom to be within allowed bounds
    const zoom = (wrapper.vm as any).zoom;
    expect(zoom).toBeGreaterThanOrEqual(1);
    expect(zoom).toBeLessThanOrEqual(4);

    wrapper.unmount();
  });
});