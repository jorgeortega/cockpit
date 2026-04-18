// Component test for ChecklistPanel.
//
// Verifies the props-in / events-out contract: given a phase id and a set of
// completed item ids, the component renders the right rows, marks the right
// rows complete, and emits the right events on click.
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChecklistPanel from './ChecklistPanel.vue'
import PhaseSelector from './PhaseSelector.vue'
import { flightChecklists, getPhaseById } from '../data/checklist'

const PHASE_ID = 'preliminary'

const makeWrapper = (completed: Set<string> = new Set()) =>
  mount(ChecklistPanel, {
    props: {
      activePhaseId: PHASE_ID,
      completedItems: completed,
    },
  })

describe('ChecklistPanel', () => {
  it('renders one row per item in the active phase', () => {
    const wrapper = makeWrapper()
    const expected = getPhaseById(PHASE_ID)!.items.length
    expect(wrapper.findAll('.checklist-item')).toHaveLength(expected)
  })

  it('marks rows whose id is in `completedItems` as completed', () => {
    const firstItemId = getPhaseById(PHASE_ID)!.items[0].id
    const wrapper = makeWrapper(new Set([firstItemId]))
    const firstRow = wrapper.findAll('.checklist-item')[0]
    expect(firstRow.classes()).toContain('completed')
  })

  it('emits `toggle-item` with the item id when a row is clicked', async () => {
    const firstItemId = getPhaseById(PHASE_ID)!.items[0].id
    const wrapper = makeWrapper()

    await wrapper.findAll('.checklist-item')[0].trigger('click')

    const events = wrapper.emitted('toggle-item')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([firstItemId])
  })

  it('emits `focus-item` with the item id when a row is clicked (for cockpit pan)', async () => {
    const firstItemId = getPhaseById(PHASE_ID)!.items[0].id
    const wrapper = makeWrapper()

    await wrapper.findAll('.checklist-item')[0].trigger('click')

    const events = wrapper.emitted('focus-item')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([firstItemId])
  })

  it('falls back to a generic heading and empty list when the phase id is unknown', () => {
    const wrapper = mount(ChecklistPanel, {
      props: {
        activePhaseId: 'no-such-phase',
        completedItems: new Set<string>(),
      },
    })
    expect(wrapper.find('h3').text()).toBe('Checklist')
    expect(wrapper.findAll('.checklist-item')).toHaveLength(0)
    expect(wrapper.find('.progress').text()).toBe('0 / 0')
  })

  it('renders a PhaseSelector wired to the full phase list', () => {
    const wrapper = makeWrapper()
    const selector = wrapper.findComponent(PhaseSelector)
    expect(selector.exists()).toBe(true)
    expect(selector.props('phases')).toEqual(flightChecklists)
    expect(selector.props('activePhaseId')).toBe(PHASE_ID)
  })

  it('re-emits phase-change from the PhaseSelector up to its parent', async () => {
    const wrapper = makeWrapper()
    const selector = wrapper.findComponent(PhaseSelector)

    await selector.vm.$emit('phase-change', 'takeoff')

    const events = wrapper.emitted('phase-change')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual(['takeoff'])
  })

  it('renders a progress bar whose width reflects completed / total', () => {
    const items = getPhaseById(PHASE_ID)!.items
    const half = new Set(items.slice(0, Math.floor(items.length / 2)).map(i => i.id))
    const wrapper = makeWrapper(half)
    const bar = wrapper.find('.progress-bar-fill')
    expect(bar.exists()).toBe(true)
    const expected = `${(half.size / items.length) * 100}%`
    expect((bar.element as HTMLElement).style.width).toBe(expected)
  })

  it('progress bar has 0% width when nothing is completed', () => {
    const wrapper = makeWrapper(new Set())
    const bar = wrapper.find('.progress-bar-fill')
    expect((bar.element as HTMLElement).style.width).toBe('0%')
  })

  it('progress bar has 100% width when every item is completed', () => {
    const allIds = new Set(getPhaseById(PHASE_ID)!.items.map(i => i.id))
    const wrapper = makeWrapper(allIds)
    const bar = wrapper.find('.progress-bar-fill')
    expect((bar.element as HTMLElement).style.width).toBe('100%')
  })

  it('progress bar gracefully shows 0% when the phase has zero items', () => {
    const wrapper = mount(ChecklistPanel, {
      props: {
        activePhaseId: 'no-such-phase',
        completedItems: new Set<string>(),
      },
    })
    const bar = wrapper.find('.progress-bar-fill')
    expect((bar.element as HTMLElement).style.width).toBe('0%')
  })

  it('exposes aria-valuenow / valuemax on the progress element', () => {
    const items = getPhaseById(PHASE_ID)!.items
    const firstTwo = new Set(items.slice(0, 2).map(i => i.id))
    const wrapper = makeWrapper(firstTwo)
    const bar = wrapper.find('[role="progressbar"]')
    expect(bar.exists()).toBe(true)
    expect(bar.attributes('aria-valuenow')).toBe('2')
    expect(bar.attributes('aria-valuemax')).toBe(String(items.length))
    expect(bar.attributes('aria-valuemin')).toBe('0')
  })

  it('re-renders when the `completedItems` prop changes (state lives in the parent)', () => {
    // Contract check: the view is a pure function of props. Swapping the
    // prop after mount must update the rendered classes; if the component
    // held its own copy of state, this assertion would fail.
    const itemId = getPhaseById(PHASE_ID)!.items[0].id
    const wrapper = makeWrapper(new Set())
    expect(wrapper.findAll('.checklist-item')[0].classes()).not.toContain('completed')

    wrapper.setProps({ completedItems: new Set([itemId]) })
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.findAll('.checklist-item')[0].classes()).toContain('completed')
    })
  })
})
