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

// Simulate the cockpit image finishing its decode with known natural
// dimensions. jsdom does not actually load <img src="..."> so naturalWidth /
// naturalHeight are 0; stubbing them + dispatching the `load` event is what
// wakes up the cover-fit pan math.
const loadImage = async (
  wrapper: ReturnType<typeof mount>,
  naturalWidth: number,
  naturalHeight: number,
) => {
  const img = wrapper.find('.cockpit-img').element as HTMLImageElement
  Object.defineProperty(img, 'naturalWidth', { value: naturalWidth, configurable: true })
  Object.defineProperty(img, 'naturalHeight', { value: naturalHeight, configurable: true })
  img.dispatchEvent(new Event('load'))
  await nextTick()
}

describe('CockpitView interactions', () => {
  beforeEach(() => {
    // Silence the dev-helper log in the logPosition test.
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pans the image via click-and-drag', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    // viewport 1000×1000, image 4000×2000 → coverScale = max(0.25, 0.5) = 0.5,
    // scaled 2000×1000, overflowX = 1000, overflowY = 0.
    await loadImage(wrapper, 4000, 2000)

    // Press near the centre.
    await wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 500,
      clientY: 500,
    })
    // Viewport should pick up the grabbing class while dragging.
    expect(wrapper.find('.cockpit-viewport').classes()).toContain('is-dragging')

    // Drag left by 1000px — pan position increases by 1 (clamped to 1).
    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: -500,
      clientY: 500,
    }))
    await nextTick()

    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    // start mouseX = 0.5, dx = -1000 → nx = 0.5 - (-1000/1000) = 1.5 → clamp 1.
    // panX = 1 * 1000 = 1000, panY = 0 → translate(-1000px, 0px).
    expect(container.style.transform).toContain('translate(-1000px, 0px)')
    // Transition is disabled while dragging so movement is 1:1 with the cursor.
    expect(container.style.transition).toBe('none')

    window.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()
    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')
    // After release the snappy ease applies again.
    expect(container.style.transition).toContain('0.15s')

    wrapper.unmount()
  })

  it('clamps drag deltas that would push pan beyond 0..1', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    await loadImage(wrapper, 4000, 2000)

    await wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 500,
      clientY: 500,
    })

    // Massive rightward drag — nx = 0.5 - 9999/1000 → negative → clamp to 0.
    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 10499,
      clientY: 500,
    }))
    await nextTick()
    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    // panX = 0 * 1000 = 0 → translate(0px, 0px).
    expect(container.style.transform).toContain('translate(0px, 0px)')

    window.dispatchEvent(new MouseEvent('mouseup'))
    wrapper.unmount()
  })

  it('pans vertically when the image overflows on Y', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    // natural 2000×4000 at IMAGE_SCALE 0.5 → scaled 1000×2000, overflowY = 1000.
    await loadImage(wrapper, 2000, 4000)

    await wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 500,
      clientY: 500,
    })
    // Big vertical drag: dy > threshold, covers dy branch of didDrag + y-axis overflow.
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: -500 }))
    await nextTick()
    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    // dragStartMouseY = 0.5, dy = -1000 → ny = 0.5 - (-1000/1000) = 1.5 → clamp 1.
    // panY = 1 * 1000 = 1000 → translate(0, -1000).
    expect(container.style.transform).toContain('translate(0px, -1000px)')

    window.dispatchEvent(new MouseEvent('mouseup'))
    wrapper.unmount()
  })

  it('window mousemove is a no-op when not dragging', () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    // No mousedown issued — the module-level listener isn't attached, but
    // dispatching via the window still verifies the guard doesn't fire
    // spurious state transitions.
    expect(() =>
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 })),
    ).not.toThrow()
    wrapper.unmount()
  })

  it('pins axes with zero overflow during drag', async () => {
    // Guard against division by zero: when the image exactly fits the
    // viewport in an axis, dragging must not move that axis.
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    // natural 2000×2000 at IMAGE_SCALE 0.5 → scaled 1000×1000 = viewport,
    // overflow 0 in both axes.
    await loadImage(wrapper, 2000, 2000)

    await wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 500,
      clientY: 500,
    })
    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 0,
      clientY: 0,
    }))
    await nextTick()
    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    // overflowX = overflowY = 0 → pan stays 0,0 regardless of drag.
    expect(container.style.transform).toContain('translate(0px, 0px)')

    window.dispatchEvent(new MouseEvent('mouseup'))
    wrapper.unmount()
  })

  it('does not start a drag on a hotspot', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    await wrapper.find('.hotspot').trigger('mousedown', { button: 0 })
    // Hotspot presses must remain click-to-open-modal, not drag.
    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')
    wrapper.unmount()
  })

  it('ignores non-primary mouse buttons', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    await wrapper.find('.cockpit-viewport').trigger('mousedown', { button: 2 })
    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')
    wrapper.unmount()
  })

  it('suppresses logPosition on the click that follows a drag', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    const imageWrapper = wrapper.find('.image-wrapper').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    stubRect(imageWrapper, { width: 500, height: 500, left: 100, top: 100 })
    await loadImage(wrapper, 4000, 2000)

    await wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 500,
      clientY: 500,
    })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 500 }))
    window.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()

    // Follow-up click on the image wrapper must not log — it's the tail of a
    // drag, not a genuine tap.
    await wrapper.find('.image-wrapper').trigger('click', {
      clientX: 350,
      clientY: 350,
    })
    expect(console.log).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('window mouseup is a no-op when not dragging', () => {
    // Covers the `if (!isDragging.value) return;` guard — a spurious global
    // mouseup must not throw or flip any state.
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    expect(() => window.dispatchEvent(new MouseEvent('mouseup'))).not.toThrow()
    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')
    wrapper.unmount()
  })

  it('toggles the crosshair via mouseenter/mouseleave', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    expect(wrapper.find('.crosshair').exists()).toBe(false)

    await wrapper.find('.cockpit-viewport').trigger('mouseenter')
    expect(wrapper.find('.crosshair').exists()).toBe(true)

    await wrapper.find('.cockpit-viewport').trigger('mouseleave')
    expect(wrapper.find('.crosshair').exists()).toBe(false)
  })

  it('jumps to a focused item and uses the slower transition', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    // The slower transition only engages once the image has loaded (otherwise
    // the pan style falls back to the passthrough 0.15s branch).
    await loadImage(wrapper, 4000, 2000)

    const firstItem = getPhaseById('cockpit-prep')!.items[0]
    await wrapper.setProps({ focusedItemId: firstItem.id })
    await nextTick()

    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    // The watch snapped pan coordinates to (x/100, y/100); transition switches
    // to the slow curve for programmatic jumps.
    expect(container.style.transition).toContain('1s')
    // Modal auto-opens to explain the focused item.
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    wrapper.unmount()
  })

  it('clears focus when focusedItemId transitions from real id to null', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    await wrapper.setProps({ focusedItemId: 'cp1' })
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
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
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
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
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
    await wrapper.setProps({ focusedItemId: 'cp1' })
    await nextTick()
    expect(wrapper.find('.modal-card').exists()).toBe(true)
  })

  it('opens the modal when a hotspot is clicked and closes via the overlay', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    expect(wrapper.find('.modal-card').exists()).toBe(false)

    await wrapper.find('.hotspot').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(false)
  })

  it('closes the modal via the GOT IT button', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    await wrapper.find('.hotspot').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(false)
  })

  it('logs click percentages via the dev helper', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
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
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    await wrapper.find('.hotspot').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    // Clicking the card itself does NOT close the modal (@click.stop).
    await wrapper.find('.modal-card').trigger('click')
    expect(wrapper.find('.modal-card').exists()).toBe(true)
  })

  it('unmounting mid-drag detaches window listeners', () => {
    // onBeforeUnmount must remove the window mousemove/mouseup listeners so a
    // later global event does not reach a disposed component.
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 0,
      clientY: 0,
    })
    wrapper.unmount()
    // No throw and no console noise from a stale handler firing.
    expect(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }))
      window.dispatchEvent(new MouseEvent('mouseup'))
    }).not.toThrow()
  })

  it('dev mode: toggle, capture, advance, prev/skip, export', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element
    const imageWrapper = wrapper.find('.image-wrapper').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    stubRect(imageWrapper, { width: 1000, height: 1000, left: 0, top: 0 })

    // Enter dev mode: hotspots disappear, panel appears.
    await wrapper.find('.dev-toggle').trigger('click')
    expect(wrapper.find('.dev-panel').exists()).toBe(true)
    expect(wrapper.findAll('.hotspot')).toHaveLength(0)
    expect(wrapper.find('.dev-progress').text()).toContain('1 /')

    // Prev is disabled at index 0.
    const prevBtn = wrapper.find('.dev-buttons button:first-child')
    expect(prevBtn.attributes('disabled')).toBeDefined()

    // Click at (250, 500) → (25%, 50%). Captures for the first item.
    await wrapper.find('.image-wrapper').trigger('click', { clientX: 250, clientY: 500 })
    // Marker rendered for captured coord.
    expect(wrapper.findAll('.dev-marker')).toHaveLength(1)
    // Auto-advanced to item 2.
    expect(wrapper.find('.dev-progress').text()).toContain('2 /')
    // Prev is now enabled.
    expect(wrapper.find('.dev-buttons button:first-child').attributes('disabled')).toBeUndefined()

    // Capture a second item in the same phase — exercises the else branch
    // of the group-init in devExport.
    await wrapper.find('.image-wrapper').trigger('click', { clientX: 300, clientY: 400 })
    expect(wrapper.findAll('.dev-marker')).toHaveLength(2)

    // Skip forward.
    await wrapper.find('.dev-buttons button:nth-child(2)').trigger('click')
    expect(wrapper.find('.dev-progress').text()).toContain('4 /')

    // Prev back.
    await wrapper.find('.dev-buttons button:first-child').trigger('click')
    expect(wrapper.find('.dev-progress').text()).toContain('3 /')

    // Export: textarea appears, clipboard writeText called with JSON.
    await wrapper.find('.dev-buttons button.primary').trigger('click')
    await nextTick()
    expect(wrapper.find('.dev-export').exists()).toBe(true)
    const textarea = wrapper.find('.dev-export').element as HTMLTextAreaElement
    const parsed = JSON.parse(textarea.value)
    expect(parsed['cockpit-prep'].cp1).toEqual({ x: 25, y: 50 })
    expect(parsed['cockpit-prep'].cp2).toEqual({ x: 30, y: 40 })
    expect(writeText).toHaveBeenCalledWith(textarea.value)

    // Exit dev mode: panel and export close, hotspots return.
    await wrapper.find('.dev-toggle').trigger('click')
    expect(wrapper.find('.dev-panel').exists()).toBe(false)
    expect(wrapper.findAll('.hotspot').length).toBeGreaterThan(0)

    wrapper.unmount()
  })

  it('dev mode: skip stops at last item; export survives clipboard failure', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    await wrapper.find('.dev-toggle').trigger('click')

    // Advance past the end — skip is clamped to the last index.
    const skipBtn = wrapper.find('.dev-buttons button:nth-child(2)')
    const progressEl = wrapper.find('.dev-progress')
    for (let i = 0; i < 500; i++) await skipBtn.trigger('click')
    const m = progressEl.text().match(/(\d+) \/ (\d+)/)
    expect(m).not.toBeNull()
    expect(m![1]).toBe(m![2])

    // Click at the last index captures, then index stays (does not advance
    // past the end).
    const viewport = wrapper.find('.cockpit-viewport').element
    const imageWrapper = wrapper.find('.image-wrapper').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    stubRect(imageWrapper, { width: 1000, height: 1000, left: 0, top: 0 })
    await wrapper.find('.image-wrapper').trigger('click', { clientX: 100, clientY: 100 })
    expect(progressEl.text()).toContain(`${m![1]} /`)

    // Export still resolves even though clipboard rejects.
    await wrapper.find('.dev-buttons button.primary').trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.find('.dev-export').exists()).toBe(true)

    wrapper.unmount()
  })

  it('mousedown on modal overlay does not start a drag', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    await wrapper.find('.hotspot').trigger('click')
    await wrapper.find('.modal-overlay').trigger('mousedown', { button: 0 })
    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')
    wrapper.unmount()
  })

  it('wheel event pans the image along both axes', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    // scaled 2000×2000, overflow 1000 in both axes.
    await loadImage(wrapper, 4000, 4000)

    // deltaY = 100 pans Y by 100/1000 = 0.1 → from 0.5 to 0.6 → panY = 600.
    // deltaX = -200 pans X by -0.2 → from 0.5 to 0.3 → panX = 300.
    await wrapper.find('.cockpit-viewport').trigger('wheel', {
      deltaX: -200,
      deltaY: 100,
    })
    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    expect(container.style.transform).toContain('translate(-300px, -600px)')
    wrapper.unmount()
  })

  it('wheel with shift maps deltaY to the X axis', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    await loadImage(wrapper, 4000, 4000)

    // Shift + deltaY = 500 → x pans by 500/1000 = 0.5 → mouseX 0.5 → 1.0.
    // Y axis not touched (shift suppresses dy). `shiftKey` is a read-only
    // MouseEvent property so we dispatch a raw WheelEvent rather than going
    // through wrapper.trigger().
    viewport.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 500,
      shiftKey: true,
      cancelable: true,
      bubbles: true,
    }))
    await nextTick()
    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    expect(container.style.transform).toContain('translate(-1000px, -500px)')
    wrapper.unmount()
  })

  it('wheel is a no-op when the image has no overflow', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    const viewport = wrapper.find('.cockpit-viewport').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    // scaled 1000×1000 exactly, overflow = 0 in both axes.
    await loadImage(wrapper, 2000, 2000)

    await wrapper.find('.cockpit-viewport').trigger('wheel', {
      deltaX: 500,
      deltaY: 500,
    })
    // Pan stays centered — no-op.
    const container = wrapper.find('.cockpit-image-container').element as HTMLElement
    expect(container.style.transform).toContain('translate(0px, 0px)')
    wrapper.unmount()
  })

  it('dev mode: toggle button is draggable', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const btn = wrapper.find('.dev-toggle')
    const getStyle = () => (btn.element as HTMLElement).style
    expect(getStyle().left).toBe('12px')
    expect(getStyle().top).toBe('12px')

    // Press on the button, drag across the viewport, release.
    await btn.trigger('mousedown', { button: 0, clientX: 20, clientY: 20 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 220, clientY: 120 }))
    await nextTick()
    expect(getStyle().left).toBe('212px')
    expect(getStyle().top).toBe('112px')

    // Click at the end of a drag does not toggle dev mode.
    window.dispatchEvent(new MouseEvent('mouseup'))
    await btn.trigger('click')
    expect(wrapper.find('.dev-panel').exists()).toBe(false)

    // A fresh, movement-free click still toggles.
    await btn.trigger('mousedown', { button: 0, clientX: 220, clientY: 120 })
    window.dispatchEvent(new MouseEvent('mouseup'))
    await btn.trigger('click')
    expect(wrapper.find('.dev-panel').exists()).toBe(true)

    wrapper.unmount()
  })

  it('dev mode: ignores non-primary button on toggle', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    const btn = wrapper.find('.dev-toggle')
    // Right-click mousedown must not start a drag or move the button.
    await btn.trigger('mousedown', { button: 2, clientX: 20, clientY: 20 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 500 }))
    const style = (btn.element as HTMLElement).style
    expect(style.left).toBe('12px')
    expect(style.top).toBe('12px')
    wrapper.unmount()
  })

  it('dev mode: clicking the toggle button does not start a drag', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })
    await wrapper.find('.dev-toggle').trigger('mousedown', { button: 0 })
    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')
    wrapper.unmount()
  })

  it('logPosition no-ops when the viewport ref is missing', () => {
    // Symmetric guard coverage for logPosition.
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })
    const el = wrapper.find('.image-wrapper').element
    wrapper.unmount()
    expect(() => el.dispatchEvent(new MouseEvent('click'))).not.toThrow()
  })
})
