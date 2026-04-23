import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CockpitView from './CockpitView.vue';
import { DEFAULT_PHASE_ID } from '../data/checklist';

describe('CockpitView guards and early returns', () => {
  it('handles null cockpitRef and non-primary mouse button safely', async () => {
    const wrapper = mount(CockpitView, { props: { activePhaseId: DEFAULT_PHASE_ID, focusedItemId: null } });

    // Ensure updateViewportSize returns when cockpitRef is null
    wrapper.vm.cockpitRef = null;
    await (wrapper.vm as any).updateViewportSize();

    // setViewportScroll returns early when no cockpitRef
    await (wrapper.vm as any).setViewportScroll(100, 100);

    // onWindowMouseMove returns early when not dragging
    wrapper.vm.isDragging = false;
    await (wrapper.vm as any).onWindowMouseMove({ clientX: 0, clientY: 0 });

    // onWindowMouseUp returns early when not dragging
    await (wrapper.vm as any).onWindowMouseUp();

    // onMouseDown returns early for non-left-button
    await (wrapper.vm as any).onMouseDown({ button: 1, clientX: 0, clientY: 0, target: document.body, preventDefault() {} });

    wrapper.unmount();
  });

  it('filters out checklist items with missing coordinates', async () => {
    const wrapper = mount(CockpitView, { props: { activePhaseId: 'cockpit-prep', focusedItemId: null } });
    // items computed should exclude items with x/y <= 0 (cockpit-prep has such an item)
    const items = (wrapper.vm as any).items as any[];
    expect(items.every(i => (i.x ?? 0) > 0 && (i.y ?? 0) > 0)).toBe(true);
    wrapper.unmount();
  });
});