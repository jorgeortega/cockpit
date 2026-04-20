// Component test for CockpitView.
//
// Verifies the data wiring:
//   - Given an `activePhaseId`, the component renders one hotspot per
//     checklist item in that phase.
//   - Switching `activePhaseId` re-renders the hotspots for the new phase.
//   - An unknown phase id produces an empty hotspot list (graceful fallback).
//
// Pan/zoom math and mouse tracking depend on DOM geometry
// (getBoundingClientRect) which jsdom stubs with zeros. Browser-level
// behaviour is covered by the separate interaction test file
// (CockpitView.interactions.test.ts) and by manual verification.
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CockpitView from './CockpitView.vue'
import { flightChecklists, getPhaseById } from '../data/checklist'

describe('CockpitView', () => {
  it('renders one hotspot per item in the active phase', () => {
    const phaseId = 'cockpit-prep'
    const expected = getPhaseById(phaseId)!.items.length

    const wrapper = mount(CockpitView, {
      props: { activePhaseId: phaseId, focusedItemId: null },
    })

    expect(wrapper.findAll('.hotspot')).toHaveLength(expected)
  })

  it('re-renders hotspots when activePhaseId changes', async () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'cockpit-prep', focusedItemId: null },
    })

    const nextPhaseId = 'before-start'
    await wrapper.setProps({ activePhaseId: nextPhaseId })

    const expected = getPhaseById(nextPhaseId)!.items.length
    expect(wrapper.findAll('.hotspot')).toHaveLength(expected)
  })

  it('renders zero hotspots if the phase id is unknown (graceful fallback)', () => {
    const wrapper = mount(CockpitView, {
      props: { activePhaseId: 'not-a-real-phase', focusedItemId: null },
    })
    expect(wrapper.findAll('.hotspot')).toHaveLength(0)
  })

  it('renders at least one hotspot for every shipped phase', () => {
    // Guard rail: catches the case where a new phase ships with an empty
    // items array. A flight student must never be presented with a blank
    // cockpit.
    for (const phase of flightChecklists) {
      const wrapper = mount(CockpitView, {
        props: { activePhaseId: phase.id, focusedItemId: null },
      })
      expect(wrapper.findAll('.hotspot').length).toBeGreaterThan(0)
    }
  })
})
