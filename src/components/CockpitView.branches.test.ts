import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CockpitView from './CockpitView.vue';
import { DEFAULT_PHASE_ID } from '../data/checklist';

describe('CockpitView branch coverage helpers', () => {
  it('exercise drag, dev toggle, and export branches', async () => {
    const wrapper = mount(CockpitView, { props: { activePhaseId: DEFAULT_PHASE_ID, focusedItemId: null }, attachTo: document.body });

    // Stub bounding rect for viewport sizing
    const el = wrapper.element as HTMLElement;
    el.getBoundingClientRect = () => ({ width: 800, height: 600, left: 0, top: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON() { return null; } });

    // Trigger image load to set sizes
    await (wrapper.vm as any).onImageLoad({ target: { naturalWidth: 1000, naturalHeight: 800 } } as any);

    // Simulate mouse drag sequence
    await (wrapper.vm as any).onMouseDown({ button: 0, clientX: 10, clientY: 10, target: document.body, preventDefault() {} });
    // Move pointer
    await (wrapper.vm as any).onWindowMouseMove({ clientX: 30, clientY: 35 });
    // Release
    await (wrapper.vm as any).onWindowMouseUp();

    // Dev toggle mouse down and up (no drag) to ensure click toggles dev mode
    await (wrapper.vm as any).onDevToggleMouseDown({ button: 0, clientX: 5, clientY: 5, stopPropagation() {} });
    await (wrapper.vm as any).onDevToggleMouseUp();

    // Click dev toggle to open dev mode
    await (wrapper.vm as any).onDevToggleClick({ preventDefault() {}, stopPropagation() {} });
    expect((wrapper.vm as any).devMode).toBe(true);

    // Populate devCaptured and call export
    (wrapper.vm as any).devCaptured = { test: { x: 10, y: 10 } };
    await (wrapper.vm as any).devExport();

    wrapper.unmount();
  });
});