// Unit tests for the checklist data module.
// Pure functions only — no Vue, no DOM — so these are the cheapest safety net
// available. A regression here cascades into every component downstream.
import { describe, it, expect } from 'vitest'
import {
  flightChecklists,
  getPhaseById,
  getItemById,
  DEFAULT_PHASE_ID,
} from './checklist'

describe('flightChecklists', () => {
  it('exposes at least one phase so the UI has something to render', () => {
    expect(flightChecklists.length).toBeGreaterThan(0)
  })

  it('gives every phase a unique id (prevents ambiguous lookups)', () => {
    const ids = flightChecklists.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('DEFAULT_PHASE_ID', () => {
  it('points to the first phase — used as the initial UI state', () => {
    expect(DEFAULT_PHASE_ID).toBe(flightChecklists[0].id)
  })
})

describe('getPhaseById', () => {
  it('returns the matching phase', () => {
    const phase = getPhaseById('cockpit-prep')
    expect(phase).toBeDefined()
    expect(phase?.id).toBe('cockpit-prep')
  })

  it('returns undefined for unknown ids (caller decides fallback)', () => {
    // Keeping this as `undefined` (vs throwing) lets callers pattern-match
    // with `?.items ?? []` — avoids try/catch ceremony at the UI layer.
    expect(getPhaseById('no-such-phase')).toBeUndefined()
  })
})

describe('ACRONYMS + expandAcronyms', () => {
  // We test a few representative entries rather than the full dictionary so a
  // future addition (e.g. "VNAV") doesn't force a test update for no reason.
  it('ACRONYMS map resolves well-known airline terms', async () => {
    const { ACRONYMS } = await import('./checklist')
    expect(ACRONYMS.APU).toMatch(/Auxiliary Power Unit/i)
    expect(ACRONYMS.IRS).toMatch(/Inertial Reference System/i)
    expect(ACRONYMS.PFD).toMatch(/Primary Flight Display/i)
  })

  it('expandAcronyms splits text into plain and annotated segments', async () => {
    const { expandAcronyms } = await import('./checklist')
    const segments = expandAcronyms('APU Fire Test')
    const [apu, space, fire, space2, test] = segments
    expect(apu).toEqual({ text: 'APU', title: expect.stringMatching(/Auxiliary/i) })
    expect(space).toEqual({ text: ' ' })
    expect(fire).toEqual({ text: 'Fire' })
    expect(space2).toEqual({ text: ' ' })
    expect(test).toEqual({ text: 'Test' })
  })

  it('expandAcronyms leaves text without acronyms untouched', async () => {
    const { expandAcronyms } = await import('./checklist')
    expect(expandAcronyms('Battery')).toEqual([{ text: 'Battery' }])
  })

  it('expandAcronyms handles empty input', async () => {
    const { expandAcronyms } = await import('./checklist')
    expect(expandAcronyms('')).toEqual([])
  })
})

describe('getItemById', () => {
  it('returns the item inside the named phase', () => {
    const item = getItemById('cockpit-prep', 'cp1')
    expect(item?.id).toBe('cp1')
  })

  it('returns undefined when the phase exists but the item does not', () => {
    expect(getItemById('cockpit-prep', 'zzz')).toBeUndefined()
  })

  it('returns undefined when the phase itself is unknown', () => {
    expect(getItemById('no-such-phase', 'cp1')).toBeUndefined()
  })
})
