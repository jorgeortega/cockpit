// Root-component integration test.
// Verifies that App wires its two children correctly:
//   - Initial state matches the default phase.
//   - `focus-item` from the checklist bubbles into `focusedItemId` on the
//     cockpit.
//   - `phase-change` from any source updates `activePhaseId` and clears any
//     stale focused item.
//   - `toggle-item` adds and removes ids from the `completedItems` set,
//     passed back down to the checklist.
//
// Children are mounted as stubs so this test focuses on wiring, not on each
// child's internals (those have their own tests).
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import App from './App.vue'
import { DEFAULT_PHASE_ID, flightChecklists } from './data/checklist'
import { STORAGE_KEY } from './data/persistence'

// Stub components exposed as real Vue components so wrapper.findComponent
// can locate them and we can emit events + read props. Using stubs keeps
// this test about App's orchestration logic only.
const CockpitStub = {
  name: 'CockpitView',
  props: ['activePhaseId', 'focusedItemId'],
  emits: ['hotspot-click'],
  template: '<div class="cockpit-stub" />',
}

const ChecklistStub = {
  name: 'ChecklistPanel',
  props: ['activePhaseId', 'completedItems', 'scrollToId'],
  emits: ['focus-item', 'phase-change', 'toggle-item'],
  template: '<div class="checklist-stub" />',
}

const mountApp = () =>
  mount(App, {
    global: {
      stubs: {
        CockpitView: CockpitStub,
        ChecklistPanel: ChecklistStub,
      },
    },
  })

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    })
  })

  it('starts on DEFAULT_PHASE_ID with no focused item and an empty completion set', () => {
    const wrapper = mountApp()
    const cockpit = wrapper.findComponent(CockpitStub)
    const checklist = wrapper.findComponent(ChecklistStub)

    expect(cockpit.props('activePhaseId')).toBe(DEFAULT_PHASE_ID)
    expect(cockpit.props('focusedItemId')).toBeNull()
    expect(checklist.props('activePhaseId')).toBe(DEFAULT_PHASE_ID)
    expect((checklist.props('completedItems') as Set<string>).size).toBe(0)
  })

  it('keeps the checklist docked on desktop and hides the mobile drawer toggle', () => {
    const wrapper = mountApp()
    expect(wrapper.find('.drawer-toggle').exists()).toBe(false)
    expect(wrapper.find('.checklist-section').classes()).not.toContain('mobile')
    wrapper.unmount()
  })

  it('shows the checklist in a closed mobile drawer that can be opened', async () => {
    window.innerWidth = 390
    const wrapper = mountApp()
    await nextTick()

    expect(wrapper.find('.drawer-toggle').exists()).toBe(true)
    expect(wrapper.find('.checklist-section').classes()).toContain('mobile')
    expect(wrapper.find('.checklist-section').classes()).not.toContain('open')

    await wrapper.find('.drawer-toggle').trigger('click')

    expect(wrapper.find('.drawer-toggle').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.checklist-section').classes()).toContain('open')
  })

  it('updates focusedItemId when the checklist emits focus-item', async () => {
    window.innerWidth = 390
    const wrapper = mountApp()
    await nextTick()
    const checklist = wrapper.findComponent(ChecklistStub)

    await wrapper.find('.drawer-toggle').trigger('click')
    await checklist.vm.$emit('focus-item', 'p1')

    expect(wrapper.findComponent(CockpitStub).props('focusedItemId')).toBe('p1')
    expect(wrapper.find('.checklist-section').classes()).not.toContain('open')
  })

  it('changes phase and clears any stale focused item on phase-change', async () => {
    const wrapper = mountApp()
    const checklist = wrapper.findComponent(ChecklistStub)

    // Set a focus first so we can prove it is cleared.
    await checklist.vm.$emit('focus-item', 'p1')
    expect(wrapper.findComponent(CockpitStub).props('focusedItemId')).toBe('p1')

    const nextPhase = flightChecklists[1].id
    await checklist.vm.$emit('phase-change', nextPhase)

    expect(wrapper.findComponent(CockpitStub).props('activePhaseId')).toBe(nextPhase)
    expect(wrapper.findComponent(CockpitStub).props('focusedItemId')).toBeNull()
    expect(wrapper.findComponent(ChecklistStub).props('activePhaseId')).toBe(nextPhase)
  })

  it('closes the mobile drawer when the phase changes', async () => {
    window.innerWidth = 390
    const wrapper = mountApp()
    await nextTick()
    const checklist = wrapper.findComponent(ChecklistStub)

    await wrapper.find('.drawer-toggle').trigger('click')
    expect(wrapper.find('.checklist-section').classes()).toContain('open')

    await checklist.vm.$emit('phase-change', flightChecklists[1].id)

    expect(wrapper.find('.checklist-section').classes()).not.toContain('open')
  })

  it('toggle-item adds an id the first time and removes it the second time', async () => {
    const wrapper = mountApp()
    const checklist = wrapper.findComponent(ChecklistStub)

    await checklist.vm.$emit('toggle-item', 'p1')
    expect(
      (wrapper.findComponent(ChecklistStub).props('completedItems') as Set<string>).has('p1'),
    ).toBe(true)

    await checklist.vm.$emit('toggle-item', 'p1')
    expect(
      (wrapper.findComponent(ChecklistStub).props('completedItems') as Set<string>).has('p1'),
    ).toBe(false)
  })

  it('adds an item idempotently and updates scrollToId when CockpitView emits hotspot-click', async () => {
    const wrapper = mountApp()
    const cockpit = wrapper.findComponent(CockpitStub)
    const checklist = wrapper.findComponent(ChecklistStub)

    // Complete first time
    await cockpit.vm.$emit('hotspot-click', 'p1')
    expect(
      (checklist.props('completedItems') as Set<string>).has('p1'),
    ).toBe(true)
    expect(checklist.props('scrollToId')).toBe('p1')

    // Second click - should still be true (idempotent)
    await cockpit.vm.$emit('hotspot-click', 'p1')
    expect(
      (checklist.props('completedItems') as Set<string>).has('p1'),
    ).toBe(true)
  })

  it('isolates completion per phase — toggling in A does not affect B', async () => {
    const wrapper = mountApp()
    const checklist = wrapper.findComponent(ChecklistStub)

    // Complete an item in the default phase (phase A).
    await checklist.vm.$emit('toggle-item', 'p1')
    expect(
      (checklist.props('completedItems') as Set<string>).has('p1'),
    ).toBe(true)

    // Switch to phase B — the completion set must be empty for that phase.
    const phaseB = flightChecklists[1].id
    await checklist.vm.$emit('phase-change', phaseB)
    expect(
      (wrapper.findComponent(ChecklistStub).props('completedItems') as Set<string>).size,
    ).toBe(0)

    // Toggle an item in B.
    const itemB = flightChecklists[1].items[0].id
    await checklist.vm.$emit('toggle-item', itemB)
    expect(
      (wrapper.findComponent(ChecklistStub).props('completedItems') as Set<string>).has(itemB),
    ).toBe(true)

    // Switch back to A — phase A's completion must still contain 'p1' and
    // must NOT contain the item from phase B.
    await checklist.vm.$emit('phase-change', DEFAULT_PHASE_ID)
    const aSet = wrapper.findComponent(ChecklistStub).props('completedItems') as Set<string>
    expect(aSet.has('p1')).toBe(true)
    expect(aSet.has(itemB)).toBe(false)
  })

  describe('persistence', () => {
    it('seeds state from localStorage on mount', () => {
      const phaseB = flightChecklists[2].id
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          activePhaseId: phaseB,
          completed: {
            [phaseB]: ['seeded-item'],
          },
        }),
      )

      const wrapper = mountApp()
      const cockpit = wrapper.findComponent(CockpitStub)
      const checklist = wrapper.findComponent(ChecklistStub)

      expect(cockpit.props('activePhaseId')).toBe(phaseB)
      expect(checklist.props('activePhaseId')).toBe(phaseB)
      expect(
        (checklist.props('completedItems') as Set<string>).has('seeded-item'),
      ).toBe(true)
    })

    it('falls back to defaults when localStorage is corrupt', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(STORAGE_KEY, '{not valid json')

      const wrapper = mountApp()
      expect(
        wrapper.findComponent(CockpitStub).props('activePhaseId'),
      ).toBe(DEFAULT_PHASE_ID)
      // Corrupt blob has been cleared — no poisoning on subsequent loads.
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('writes to localStorage on phase change', async () => {
      const wrapper = mountApp()
      const checklist = wrapper.findComponent(ChecklistStub)
      const nextPhase = flightChecklists[1].id

      await checklist.vm.$emit('phase-change', nextPhase)

      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed.activePhaseId).toBe(nextPhase)
    })

    it('writes to localStorage on toggle-item', async () => {
      const wrapper = mountApp()
      const checklist = wrapper.findComponent(ChecklistStub)

      await checklist.vm.$emit('toggle-item', 'p1')

      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed.completed[DEFAULT_PHASE_ID]).toContain('p1')
    })
  })
})
