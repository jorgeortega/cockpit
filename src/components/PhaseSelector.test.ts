// Component test for PhaseSelector.
//
// PhaseSelector is a pure presentational tab strip. It renders one button per
// flight phase, highlights the active one, and emits `phase-change` with the
// id of whichever tab the user activates (click or keyboard).
//
// Keyboard nav (arrows, Home/End) lands in Slice 4; this suite covers only
// the rendering + click path to keep the RED/GREEN cycle tight.
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import PhaseSelector from './PhaseSelector.vue'
import { flightChecklists } from '../data/checklist'

const PHASES = flightChecklists

describe('PhaseSelector', () => {
  it('renders one tab per phase', () => {
    const wrapper = mount(PhaseSelector, {
      props: { phases: PHASES, activePhaseId: PHASES[0].id },
    })
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(PHASES.length)
  })

  it('marks the tab whose id matches activePhaseId as active', () => {
    const wrapper = mount(PhaseSelector, {
      props: { phases: PHASES, activePhaseId: PHASES[2].id },
    })
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0].classes()).not.toContain('active')
    expect(tabs[2].classes()).toContain('active')
    expect(tabs[2].attributes('aria-selected')).toBe('true')
    expect(tabs[0].attributes('aria-selected')).toBe('false')
  })

  it('emits phase-change with the clicked phase id', async () => {
    const wrapper = mount(PhaseSelector, {
      props: { phases: PHASES, activePhaseId: PHASES[0].id },
    })
    const targetIndex = 3
    await wrapper.findAll('[role="tab"]')[targetIndex].trigger('click')

    const events = wrapper.emitted('phase-change')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([PHASES[targetIndex].id])
  })

  it('does not emit phase-change when the active tab is re-clicked', async () => {
    const activeIndex = 1
    const wrapper = mount(PhaseSelector, {
      props: { phases: PHASES, activePhaseId: PHASES[activeIndex].id },
    })
    await wrapper.findAll('[role="tab"]')[activeIndex].trigger('click')
    // Re-clicking the already-active tab is a no-op. This prevents the parent
    // from doing needless work (e.g. clearing `focusedItemId`) on spurious
    // activations.
    expect(wrapper.emitted('phase-change')).toBeUndefined()
  })

  it('exposes the tablist role on the container for assistive tech', () => {
    const wrapper = mount(PhaseSelector, {
      props: { phases: PHASES, activePhaseId: PHASES[0].id },
    })
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
  })

  it('renders the phase label as the tab text', () => {
    const wrapper = mount(PhaseSelector, {
      props: { phases: PHASES, activePhaseId: PHASES[0].id },
    })
    const tabs = wrapper.findAll('[role="tab"]')
    PHASES.forEach((phase, i) => {
      expect(tabs[i].text()).toBe(phase.label)
    })
  })

  describe('keyboard navigation', () => {
    const firstId = PHASES[0].id
    const lastId = PHASES[PHASES.length - 1].id

    const pressKey = (activeIdx: number, key: string) => {
      const wrapper = mount(PhaseSelector, {
        props: { phases: PHASES, activePhaseId: PHASES[activeIdx].id },
      })
      wrapper.find('[role="tablist"]').trigger('keydown', { key })
      return wrapper
    }

    it('ArrowRight moves to the next phase', () => {
      const wrapper = pressKey(0, 'ArrowRight')
      expect(wrapper.emitted('phase-change')?.[0]).toEqual([PHASES[1].id])
    })

    it('ArrowLeft moves to the previous phase', () => {
      const wrapper = pressKey(2, 'ArrowLeft')
      expect(wrapper.emitted('phase-change')?.[0]).toEqual([PHASES[1].id])
    })

    it('ArrowRight wraps from the last phase to the first', () => {
      const wrapper = pressKey(PHASES.length - 1, 'ArrowRight')
      expect(wrapper.emitted('phase-change')?.[0]).toEqual([firstId])
    })

    it('ArrowLeft wraps from the first phase to the last', () => {
      const wrapper = pressKey(0, 'ArrowLeft')
      expect(wrapper.emitted('phase-change')?.[0]).toEqual([lastId])
    })

    it('Home jumps to the first phase', () => {
      const wrapper = pressKey(5, 'Home')
      expect(wrapper.emitted('phase-change')?.[0]).toEqual([firstId])
    })

    it('End jumps to the last phase', () => {
      const wrapper = pressKey(0, 'End')
      expect(wrapper.emitted('phase-change')?.[0]).toEqual([lastId])
    })

    it('ignores unrelated keys', () => {
      const wrapper = pressKey(0, 'Enter')
      expect(wrapper.emitted('phase-change')).toBeUndefined()
    })

    it('does not emit when the phase list is empty', () => {
      const wrapper = mount(PhaseSelector, {
        props: { phases: [], activePhaseId: '' },
      })
      wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.emitted('phase-change')).toBeUndefined()
    })
  })

  it('renders zero tabs if handed an empty phases array (graceful fallback)', () => {
    const wrapper = mount(PhaseSelector, {
      props: { phases: [], activePhaseId: '' },
    })
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(0)
    // Container still renders so layout is stable.
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
  })
})
