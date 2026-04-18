// Interaction coverage for CockpitView.
//
// The primary CockpitView test covers the data wiring (how many hotspots
// render for a given phase). This suite exercises the behavioural code paths:
// mouse tracking, the watch on `focusedItemId`, modal open/close, and the dev
// helper that logs click coordinates.
//
// jsdom returns zeroed bounding rects by default. To test the pan math we
// stub `getBoundingClientRect` on the mounted element so the component sees
// predictable coordinates.
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import CockpitView from './CockpitView.vue'
import { getPhaseById } from '../data/checklist'

const stubRect = (el: Element, rect: Partial<DOMRect>) => {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0,
      width: 0, height: 0, toJSON: () => ({}),
      ...rect,
    } as DOMRect)
}

describe('CockpitView interactions', () => {
  beforeEach(() => {
    // Silence the dev-helper log in the logPosition test.
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updates the pan transform as the mouse moves', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })

    // Off-centre — non-zero offset with the fast (non-focused) transition.
    await wrapper.find('.cockpit-viewport').trigger('mousemove', {
      clientX: 1000,
      clientY: 1000,
    })
    await nextTick()
    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    // (1 - 0.5) * 45 = 22.5 → translate(-22.5%, -32.5%)
    expect(container.style.transform).toContain('translate(-22.5%, -32.5%)')
    expect(container.style.transition).toContain('0.15s')

    wrapper.unmount()
  })

  it('clamps mouse coordinates that fall outside the viewport', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })

    // Cursor way past the right/bottom edge — normalised should clamp to 1.
    await wrapper.find('.cockpit-viewport').trigger('mousemove', {
      clientX: 9999,
      clientY: 9999,
    })
    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    // (1 - 0.5) * 45 = 22.5, (1 - 0.5) * 65 = 32.5 → translate(-22.5%, -32.5%)
    expect(container.style.transform).toContain('translate(-22.5%, -32.5%)')

    wrapper.unmount()
  })

  it('toggles the crosshair via mouseenter/mouseleave', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })

    expect(wrapper.find('.crosshair').exists()).toBe(false)

    await wrapper.find('.cockpit-viewport').trigger('mouseenter')
    expect(wrapper.find('.crosshair').exists()).toBe(true)

    await wrapper.find('.cockpit-viewport').trigger('mouseleave')
    expect(wrapper.find('.crosshair').exists()).toBe(false)
  })

  it('jumps to a focused item and uses the slower transition', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })

    const firstItem = getPhaseById('preliminary')!.items[0]
    await wrapper.setProps({ focusedItemId: firstItem.id })
    await nextTick()

    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    // The watch snapped pan coordinates to (x/100, y/100), so the transform
    // reflects those percentages and the transition is the slow curve.
    expect(container.style.transition).toContain('1s')
    expect(container.style.transform).toContain('scale(1.5)')
    // Modal auto-opens to explain the focused item.
    expect(wrapper.find('.modal-card').exists()).toBe(true)
  })

  it('clears focus when focusedItemId transitions from real id to null', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })

    await wrapper.setProps({ focusedItemId: 'p1' })
    await nextTick()
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    await wrapper.find('.close-btn').trigger('click')
    // Real → null transition triggers the watch with id === null.
    await wrapper.setProps({ focusedItemId: null })
    await nextTick()
    expect(wrapper.find('.modal-card').exists()).toBe(false)
  })

  it('logPosition no-ops when the image wrapper is missing', () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
      attachTo: document.body,
    })

    // Replace the viewport ref's querySelector so `.image-wrapper` resolves to
    // null. logPosition must return silently and not invoke console.log.
    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    const original = viewport.querySelector.bind(viewport)
    viewport.querySelector = ((sel: string) =>
      sel === '.image-wrapper' ? null : original(sel)) as typeof viewport.querySelector

    // Trigger directly on the image wrapper — the handler is bound via @click.
    wrapper.find('.image-wrapper').trigger('click', { clientX: 10, clientY: 10 })

    expect(console.log).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('ignores a null focusedItemId and ignores unknown item ids', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })
    await nextTick()
    expect(wrapper.find('.modal-card').exists()).toBe(false)

    // Setting to null (no change) is a no-op.
    await wrapper.setProps({ focusedItemId: null })
    await nextTick()
    expect(wrapper.find('.modal-card').exists()).toBe(false)

    // Unknown id is also a no-op — the watch finds nothing and does nothing.
    await wrapper.setProps({ focusedItemId: 'does-not-exist' })
    await nextTick()
    expect(wrapper.find('.modal-card').exists()).toBe(false)

    // A real id does open the modal.
    await wrapper.setProps({ focusedItemId: 'p1' })
    await nextTick()
    expect(wrapper.find('.modal-card').exists()).toBe(true)
  })

  it('opens the modal when a hotspot is clicked and closes via the overlay', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })

    expect(wrapper.find('.modal-card').exists()).toBe(false)

    await wrapper.find('.hotspot').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(false)
  })

  it('closes the modal via the GOT IT button', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })

    await wrapper.find('.hotspot').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(false)
  })

  it('logs click percentages via the dev helper', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    const imageWrapper = wrapper.find('.image-wrapper').element
    // Stub both rects — the viewport ref calls querySelector('.image-wrapper').
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    stubRect(imageWrapper, { width: 500, height: 500, left: 100, top: 100 })

    await wrapper.find('.image-wrapper').trigger('click', {
      clientX: 350,
      clientY: 350,
    })

    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/Clicked at X: 50\.00%, Y: 50\.00%/),
    )

    wrapper.unmount()
  })

  it('modal click on the card itself does not close (stop propagation)', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })

    await wrapper.find('.hotspot').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    // Clicking the card itself does NOT close the modal (@click.stop).
    await wrapper.find('.modal-card').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(true)
  })

  it('handleMouseMove no-ops when the ref is not yet attached', () => {
    // Covers the `if (!cockpitRef.value) return;` guard: we mount, then
    // manually unmount so the ref is null, then attempt to fire a mousemove
    // directly on the detached element. Behaviour: no throw.
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })
    const el = wrapper.find('.cockpit-viewport').element
    wrapper.unmount()
    expect(() => el.dispatchEvent(new MouseEvent('mousemove'))).not.toThrow()
  })

  it('logPosition no-ops when the viewport ref is missing', () => {
    // Symmetric guard coverage for logPosition.
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'preliminary', focusedItemId: null },
    })
    const el = wrapper.find('.image-wrapper').element
    wrapper.unmount()
    expect(() => el.dispatchEvent(new MouseEvent('click'))).not.toThrow()
  })
})
