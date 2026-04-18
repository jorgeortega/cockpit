// Visual acronym expansion on ChecklistItemRow.
//
// Flight students benefit from seeing "APU" spelled out as "Auxiliary Power
// Unit" on hover — but only when an acronym actually appears in the row's
// label or action. We render these via the native `<abbr title="...">` tag
// (free tooltip + screen-reader expansion, zero extra code).
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChecklistItemRow from './ChecklistItemRow.vue'
import type { ChecklistItem } from '../data/checklist'

const make = (overrides: Partial<ChecklistItem> = {}) =>
  mount(ChecklistItemRow, {
    props: {
      item: {
        id: 'x',
        item: 'Battery 1 & 2',
        action: 'Auto/Check',
        panel: 'overhead',
        ...overrides,
      },
      completed: false,
    },
  })

describe('ChecklistItemRow acronym expansion', () => {
  it('wraps known acronyms in the label in <abbr> with a title', () => {
    const wrapper = make({ item: 'APU Fire Test' })
    const abbr = wrapper.find('.label abbr')
    expect(abbr.exists()).toBe(true)
    expect(abbr.text()).toBe('APU')
    expect(abbr.attributes('title')).toMatch(/Auxiliary Power Unit/i)
  })

  it('wraps known acronyms in the action in <abbr>', () => {
    const wrapper = make({ action: 'TOGA' })
    const abbr = wrapper.find('.action abbr')
    expect(abbr.exists()).toBe(true)
    expect(abbr.text()).toBe('TOGA')
    expect(abbr.attributes('title')).toMatch(/Take-Off \/ Go-Around/i)
  })

  it('leaves plain words untouched (no spurious <abbr>)', () => {
    const wrapper = make({ item: 'Battery' })
    expect(wrapper.find('.label abbr').exists()).toBe(false)
    expect(wrapper.find('.label').text()).toBe('Battery')
  })

  it('renders a mix of plain + acronym segments', () => {
    // "IRS Mode Select" — only "IRS" should be an abbr; the rest stays plain.
    const wrapper = make({ item: 'IRS Mode Select' })
    const abbrs = wrapper.findAll('.label abbr')
    expect(abbrs).toHaveLength(1)
    expect(abbrs[0].text()).toBe('IRS')
    expect(wrapper.find('.label').text().replace(/\s+/g, ' ')).toBe('IRS Mode Select')
  })
})
