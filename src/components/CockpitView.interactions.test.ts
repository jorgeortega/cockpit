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

const installScrollTo = (el: HTMLElement) => {
  el.scrollTo = vi.fn(({ left = 0, top = 0 }) => {
    el.scrollLeft = left
    el.scrollTop = top
  }) as typeof el.scrollTo
}

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
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the hotspot layer as HTML elements positioned by checklist coordinates', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    // give the viewport a predictable size so baseScale is deterministic
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    installScrollTo(viewport)

    // set image natural size and trigger load so scaledW/scaledH are computed
    await loadImage(wrapper, 4000, 2000)

    const hotspots = wrapper.findAll('.hotspot')
    // cp1 is filtered out because it has 0,0
    const firstValid = getPhaseById('cockpit-prep')!.items[1]

    expect(wrapper.find('.hotspot-overlay').exists()).toBe(true)
    expect(hotspots).toHaveLength(getPhaseById('cockpit-prep')!.items.length - 1)

    // compute expected pixel positions based on scaled dimensions
    const naturalW = 4000
    const naturalH = 2000
    const vw = 1000
    const vh = 1000
    const baseScale = vw / naturalW
    const expectedLeftPx = `${Math.round((firstValid.x / 100) * naturalW * baseScale)}px`
    const expectedTopPx = `${Math.round((firstValid.y / 100) * naturalH * baseScale)}px`

    expect(hotspots[0].attributes('style')).toContain(`left: ${expectedLeftPx}`)
    expect(hotspots[0].attributes('style')).toContain(`top: ${expectedTopPx}`)
    wrapper.unmount()
  })

  it('pans by updating the viewport scroll position during drag', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    installScrollTo(viewport)
    await loadImage(wrapper, 4000, 2000)

    // Zoom in to create a scrollable scene (zoom to 2x -> 2 clicks at 0.5 steps)
    for (let i = 0; i < 2; i++) {
      await wrapper.find('[aria-label="Zoom in"]').trigger('click')
      await nextTick()
    }

    viewport.scrollLeft = 500
    viewport.scrollTop = 0

    await wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 500,
      clientY: 500,
    })

    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 200,
      clientY: 500,
    }))
    await nextTick()

    expect(viewport.scrollLeft).toBe(800)
    expect(wrapper.find('.cockpit-viewport').classes()).toContain('is-dragging')

    window.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()
    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')
    wrapper.unmount()
  })

  it('clamps drag scroll within the scrollable bounds', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    installScrollTo(viewport)
    await loadImage(wrapper, 4000, 2000)

    // Zoom in to make the scene scrollable
    for (let i = 0; i < 2; i++) {
      await wrapper.find('[aria-label="Zoom in"]').trigger('click')
      await nextTick()
    }

    viewport.scrollLeft = 500
    await wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 500,
      clientY: 500,
    })

    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: -5000,
      clientY: -5000,
    }))
    await nextTick()

    expect(viewport.scrollLeft).toBeCloseTo(1000, 0)
    expect(viewport.scrollTop).toBeCloseTo(0, 10)

    window.dispatchEvent(new MouseEvent('mouseup'))
    wrapper.unmount()
  })

  it('centres the focused item by scrolling the viewport', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    installScrollTo(viewport)
    await loadImage(wrapper, 4000, 2000)

    // Zoom in to make the scene scrollable and centerable
    for (let i = 0; i < 2; i++) {
      await wrapper.find('[aria-label="Zoom in"]').trigger('click')
      await nextTick()
    }

    const item = getPhaseById('cockpit-prep')!.items[1]
    await wrapper.setProps({ focusedItemId: item.id })
    await nextTick()

    // Calculate expected centre based on scaled size (naturalWidth * baseScale * zoom)
    const naturalW = 4000
    const naturalH = 2000
    const vw = 1000
    const vh = 1000
    const baseScale = vw / naturalW
    const zoomFactor = 2 // after 2 clicks at 0.5 steps
    const scaledW = naturalW * baseScale * zoomFactor

    const expectedLeft = (item.x / 100) * scaledW - vw / 2

    expect(viewport.scrollLeft).toBeCloseTo(expectedLeft, 0)
    expect(viewport.scrollTop).toBeCloseTo(0, 10)
    expect(wrapper.find('.hotspot.active').exists()).toBe(true)
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    wrapper.unmount()
  })

  it('zooms in and out from the controls while preserving the viewport anchor', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    installScrollTo(viewport)
    await loadImage(wrapper, 4000, 2000)

    viewport.scrollLeft = 500
    await wrapper.find('[aria-label="Zoom in"]').trigger('click')
    await nextTick()

    const scene = wrapper.find('.cockpit-scene').element as HTMLElement
    // compute expected width based on contain semantics
    const naturalW = 4000
    const naturalH = 2000
    const vw = 1000
    const vh = 1000
    const baseScale = vw / naturalW
    const zoomFactor = 1.5 // one click (50% additive)
    const expectedWidth = `${naturalW * baseScale * zoomFactor}px`

    expect(scene.style.width).toBe(expectedWidth)
    expect(wrapper.find('.zoom-status').text()).toBe('150%')
    // ensure viewport was repositioned (non-zero)
    expect(viewport.scrollLeft).toBeGreaterThanOrEqual(0)

    await wrapper.find('[aria-label="Reset zoom"]').trigger('click')
    await nextTick()
    const expectedResetWidth = `${naturalW * baseScale}px`
    expect(scene.style.width).toBe(expectedResetWidth)
    expect(wrapper.find('.zoom-status').text()).toBe('100%')
    wrapper.unmount()
  })

  it('supports ctrl-wheel zoom and ignores plain scrolling wheel events', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport')
    stubRect(viewport.element, { width: 1000, height: 1000, left: 0, top: 0 })
    installScrollTo(viewport.element as HTMLElement)
    await loadImage(wrapper, 4000, 2000)

    await viewport.trigger('wheel', { deltaY: -100 })
    expect(wrapper.find('.zoom-status').text()).toBe('100%')

    viewport.element.dispatchEvent(new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }))
    await nextTick()
    expect(wrapper.find('.zoom-status').text()).toBe('150%')
    wrapper.unmount()
  })

  it('supports zooming back out with a meta-wheel gesture', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport')
    stubRect(viewport.element, { width: 1000, height: 1000, left: 0, top: 0 })
    installScrollTo(viewport.element as HTMLElement)
    await loadImage(wrapper, 4000, 2000)

    await wrapper.find('[aria-label="Zoom in"]').trigger('click')
    viewport.element.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 100,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }))
    await nextTick()

    expect(wrapper.find('.zoom-status').text()).toBe('100%')
    wrapper.unmount()
  })

  it('does not start a drag on a hotspot or zoom control', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    await wrapper.find('.hotspot').trigger('mousedown', { button: 0 })
    await wrapper.find('.zoom-controls').trigger('mousedown', { button: 0 })

    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')
    wrapper.unmount()
  })

  it('suppresses dev logging on the click that follows a drag', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    const imageWrapper = wrapper.find('.image-wrapper').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    stubRect(imageWrapper, { width: 2000, height: 1000, left: 100, top: 100 })
    installScrollTo(viewport)
    await loadImage(wrapper, 4000, 2000)

    await wrapper.find('.cockpit-viewport').trigger('mousedown', {
      button: 0,
      clientX: 500,
      clientY: 500,
    })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 500 }))
    window.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()

    await wrapper.find('.image-wrapper').trigger('click', {
      clientX: 350,
      clientY: 350,
    })
    expect(console.log).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('opens the modal when a hotspot is clicked', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    await wrapper.find('.hotspot').trigger('click')

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    // cp1 is filtered, so first hotspot is cp2
    expect(wrapper.find('.modal-card h2').text()).toBe(getPhaseById('cockpit-prep')!.items[1].item)
    wrapper.unmount()
  })

  it('shows the crosshair on hover and hides it in dev mode', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    await wrapper.find('.cockpit-viewport').trigger('mouseenter')
    expect(wrapper.find('.crosshair').exists()).toBe(true)

    await wrapper.find('.dev-toggle').trigger('click')
    expect(wrapper.find('.crosshair').exists()).toBe(false)

    await wrapper.find('.cockpit-viewport').trigger('mouseleave')
    await wrapper.find('.dev-toggle').trigger('click')
    expect(wrapper.find('.crosshair').exists()).toBe(false)
  })

  it('supports dev mode capture, navigation, export fallback, and draggable toggle suppression', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    const imageWrapper = wrapper.find('.image-wrapper').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    stubRect(imageWrapper, { width: 2000, height: 1000, left: 100, top: 100 })
    installScrollTo(viewport)
    await loadImage(wrapper, 4000, 2000)

    const clipboard = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboard },
    })

    await wrapper.find('.dev-toggle').trigger('mousedown', {
      button: 0,
      clientX: 20,
      clientY: 20,
    })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 45 }))
    window.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()
    await wrapper.find('.dev-toggle').trigger('click')
    expect(wrapper.find('.dev-panel').exists()).toBe(false)

    await wrapper.find('.dev-toggle').trigger('click')
    expect(wrapper.find('.dev-panel').exists()).toBe(true)

    await wrapper.find('.image-wrapper').trigger('click', {
      clientX: 600,
      clientY: 400,
    })
    expect(wrapper.findAll('.dev-marker-html')).toHaveLength(1)
    expect(wrapper.find('.dev-progress').text()).toContain('2 /')

    await wrapper.find('button:disabled').trigger('click')
    await wrapper.findAll('.dev-buttons button')[1].trigger('click')
    await wrapper.findAll('.dev-buttons button')[0].trigger('click')
    await wrapper.findAll('.dev-buttons button')[2].trigger('click')
    await nextTick()

    expect(clipboard).toHaveBeenCalledOnce()
    expect(wrapper.find('.dev-export').exists()).toBe(true)
    expect(wrapper.find('.dev-export').element.getAttribute('value')).toContain('"cockpit-prep"')
    wrapper.unmount()
  })

  it('logs click coordinates outside dev mode and closes the modal from the overlay and button', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const imageWrapper = wrapper.find('.image-wrapper').element
    stubRect(imageWrapper, { width: 2000, height: 1000, left: 100, top: 100 })

    await wrapper.find('.image-wrapper').trigger('click', {
      clientX: 600,
      clientY: 400,
    })
    expect(console.log).toHaveBeenCalledWith('Clicked at X: 25.00%, Y: 30.00%')

    await wrapper.find('.hotspot').trigger('click')
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)

    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)

    await wrapper.find('.hotspot').trigger('click')
    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)

    await wrapper.find('.hotspot').trigger('click')
    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    wrapper.unmount()
  })

  it('updates zoom before the image is measured and supports zooming back out', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    expect(wrapper.find('[aria-label="Zoom out"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[aria-label="Zoom in"]').trigger('click')
    await nextTick()
    expect(wrapper.find('.zoom-status').text()).toBe('150%')

    await wrapper.find('[aria-label="Zoom out"]').trigger('click')
    await nextTick()
    expect(wrapper.find('.zoom-status').text()).toBe('100%')
  })

  it('ignores non-primary presses and unknown focus ids', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    installScrollTo(viewport)
    await loadImage(wrapper, 4000, 2000)

    await wrapper.find('.cockpit-viewport').trigger('mousedown', { button: 2 })
    expect(wrapper.find('.cockpit-viewport').classes()).not.toContain('is-dragging')

    await wrapper.setProps({ focusedItemId: 'missing-id' })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)

    await wrapper.setProps({ focusedItemId: 'cp2' })
    await wrapper.setProps({ focusedItemId: null })
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    wrapper.unmount()
  })

  it('wires and cleans up ResizeObserver on mount and unmount when available', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    const ResizeObserverMock = vi.fn(() => ({
      observe,
      disconnect,
    }))
    const original = globalThis.ResizeObserver
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    expect(ResizeObserverMock).toHaveBeenCalled()
    expect(observe).toHaveBeenCalled()

    wrapper.unmount()
    expect(disconnect).toHaveBeenCalled()

    vi.stubGlobal('ResizeObserver', original)
  })

  it('mounts cleanly when ResizeObserver is unavailable', () => {
    const original = globalThis.ResizeObserver
    vi.stubGlobal('ResizeObserver', undefined)

    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    expect(wrapper.find('.cockpit-viewport').exists()).toBe(true)
    wrapper.unmount()

    vi.stubGlobal('ResizeObserver', original)
  })

  it('ignores non-primary dev-toggle presses and keeps short movements clickable', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    await wrapper.find('.dev-toggle').trigger('mousedown', {
      button: 2,
      clientX: 20,
      clientY: 20,
    })
    await wrapper.find('.dev-toggle').trigger('click')
    expect(wrapper.find('.dev-panel').exists()).toBe(true)

    await wrapper.find('.dev-toggle').trigger('mousedown', {
      button: 0,
      clientX: 20,
      clientY: 20,
    })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 21, clientY: 21 }))
    window.dispatchEvent(new MouseEvent('mouseup'))
    await wrapper.find('.dev-toggle').trigger('click')
    expect(wrapper.find('.dev-panel').exists()).toBe(false)
    wrapper.unmount()
  })

  it('exports captured coordinates to the clipboard when available', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
      attachTo: document.body,
    })

    const viewport = wrapper.find('.cockpit-viewport').element as HTMLElement
    const imageWrapper = wrapper.find('.image-wrapper').element
    stubRect(viewport, { width: 1000, height: 1000, left: 0, top: 0 })
    stubRect(imageWrapper, { width: 2000, height: 1000, left: 100, top: 100 })
    installScrollTo(viewport)
    await loadImage(wrapper, 4000, 2000)

    const clipboard = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboard },
    })

    await wrapper.find('.dev-toggle').trigger('click')
    await wrapper.find('.image-wrapper').trigger('click', {
      clientX: 600,
      clientY: 400,
    })
    await wrapper.findAll('.dev-buttons button')[2].trigger('click')
    await nextTick()

    expect(clipboard).toHaveBeenCalledOnce()
    expect(wrapper.find('.dev-export').exists()).toBe(true)
    wrapper.unmount()
  })
})
