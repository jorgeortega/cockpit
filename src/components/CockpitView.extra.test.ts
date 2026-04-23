import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CockpitView from './CockpitView.vue';
import { DEFAULT_PHASE_ID } from '../data/checklist';

describe('CockpitView extra branches', () => {
  it('calls setZoom fallback path when image natural size is zero', async () => {
    const wrapper = mount(CockpitView, { props: { activePhaseId: DEFAULT_PHASE_ID, focusedItemId: null } });

    // Ensure scaledW/scaledH path where imageNaturalW/H are zero
    await (wrapper.vm as any).onImageLoad({ target: { naturalWidth: 0, naturalHeight: 0 } } as any);

    // Call setZoom which should take the early-return branch
    await (wrapper.vm as any).setZoom(2);
    const zoom = (wrapper.vm as any).zoom;
    expect(zoom).toBeGreaterThanOrEqual(1);
    expect(zoom).toBeLessThanOrEqual(4);

    wrapper.unmount();
  });

  it('handles a focusedItemId that does not exist gracefully', async () => {
    const wrapper = mount(CockpitView, { props: { activePhaseId: DEFAULT_PHASE_ID, focusedItemId: null }, attachTo: document.body });
    // Stub bounding rect
    (wrapper.element as HTMLElement).getBoundingClientRect = () => ({ width: 800, height: 600, left: 0, top: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON() { return null; } });
    await (wrapper.vm as any).onImageLoad({ target: { naturalWidth: 800, naturalHeight: 600 } } as any);

    // Set a focused id that doesn't exist; watcher should return early without throwing
    await wrapper.setProps({ focusedItemId: 'no-such-id' });

    wrapper.unmount();
  });
});