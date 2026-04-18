// Component test for ChecklistItemRow.
//
// A single row in the checklist. Presentational: props in, events out. The
// parent (ChecklistPanel) owns the completion set and the active phase; this
// row only renders one `ChecklistItem` and emits on click.
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChecklistItemRow from './ChecklistItemRow.vue'
import type { ChecklistItem } from '../data/checklist'

const ITEM: ChecklistItem = {
  id: 'p1',
  item: 'Battery 1 & 2',
  action: 'Auto/Check',
  panel: 'overhead',
  description: 'Voltage check.',
  x: 45,
  y: 20,
}

describe('ChecklistItemRow', () => {
  it('renders the item label and the required action', () => {
    const wrapper = mount(ChecklistItemRow, {
      props: { item: ITEM, completed: false },
    })
    expect(wrapper.find('.label').text()).toBe(ITEM.item)
    expect(wrapper.find('.action').text()).toBe(ITEM.action)
  })

  it('applies the completed class + tick glyph when `completed` is true', () => {
    const wrapper = mount(ChecklistItemRow, {
      props: { item: ITEM, completed: true },
    })
    expect(wrapper.classes()).toContain('completed')
    expect(wrapper.find('.checkbox').text()).toContain('✓')
  })

  it('omits the tick glyph when `completed` is false', () => {
    const wrapper = mount(ChecklistItemRow, {
      props: { item: ITEM, completed: false },
    })
    expect(wrapper.classes()).not.toContain('completed')
    expect(wrapper.find('.checkbox').text()).not.toContain('✓')
  })

  it('emits toggle and focus with the item id on click', async () => {
    const wrapper = mount(ChecklistItemRow, {
      props: { item: ITEM, completed: false },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([[ITEM.id]])
    expect(wrapper.emitted('focus')).toEqual([[ITEM.id]])
  })

  it('exposes aria-checked so screen readers can announce the state', () => {
    const unchecked = mount(ChecklistItemRow, {
      props: { item: ITEM, completed: false },
    })
    expect(unchecked.attributes('aria-checked')).toBe('false')
    expect(unchecked.attributes('role')).toBe('checkbox')

    const checked = mount(ChecklistItemRow, {
      props: { item: ITEM, completed: true },
    })
    expect(checked.attributes('aria-checked')).toBe('true')
  })
})
