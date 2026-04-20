// Unit tests for the localStorage persistence layer.
//
// The module is small and side-effecty (touches window.localStorage) so jsdom
// gives us a real implementation to test against. Each test starts from a
// clean localStorage so no two tests contaminate each other.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  STORAGE_KEY,
  loadState,
  saveState,
  serialize,
  deserialize,
  type PersistedState,
} from './persistence'

const sampleState: PersistedState = {
  version: 2,
  activePhaseId: 'before-start',
  completed: {
    'cockpit-prep': ['cp1', 'cp2'],
    'before-start': ['bs1'],
  },
}

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('serialize / deserialize', () => {
    it('round-trips a Map<string, Set<string>> through a plain object', () => {
      const original = new Map<string, Set<string>>([
        ['cockpit-prep', new Set(['cp1', 'cp2'])],
        ['before-start', new Set(['bs1'])],
      ])
      const record = serialize(original)
      expect(record).toEqual({
        'cockpit-prep': ['cp1', 'cp2'],
        'before-start': ['bs1'],
      })
      const restored = deserialize(record)
      expect(restored.get('cockpit-prep')).toEqual(new Set(['cp1', 'cp2']))
      expect(restored.get('before-start')).toEqual(new Set(['bs1']))
    })

    it('deserialize handles an empty record', () => {
      expect(deserialize({}).size).toBe(0)
    })
  })

  describe('saveState + loadState', () => {
    it('round-trips state through localStorage', () => {
      saveState(sampleState)
      expect(loadState()).toEqual(sampleState)
    })

    it('uses the versioned storage key', () => {
      saveState(sampleState)
      expect(STORAGE_KEY).toBe('cockpit-sim:v2')
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    })
  })

  describe('loadState — defensive', () => {
    it('returns null when no state has ever been saved', () => {
      expect(loadState()).toBeNull()
    })

    it('returns null and clears the key when the stored JSON is malformed', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(STORAGE_KEY, 'this is not json')
      expect(loadState()).toBeNull()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(warn).toHaveBeenCalled()
    })

    it('returns null and clears the key when the version does not match', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 999, activePhaseId: 'x', completed: {} }),
      )
      expect(loadState()).toBeNull()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(warn).toHaveBeenCalled()
    })

    it('returns null and clears the key when the shape is invalid', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, activePhaseId: 123, completed: 'nope' }),
      )
      expect(loadState()).toBeNull()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(warn).toHaveBeenCalled()
    })

    it('rejects `completed` whose values are not string arrays', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          activePhaseId: 'cockpit-prep',
          completed: { 'cockpit-prep': [1, 2, 3] },
        }),
      )
      expect(loadState()).toBeNull()
      expect(warn).toHaveBeenCalled()
    })

    it('rejects `completed` whose values are not arrays at all', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          activePhaseId: 'cockpit-prep',
          completed: { 'cockpit-prep': 'cp1' },
        }),
      )
      expect(loadState()).toBeNull()
      expect(warn).toHaveBeenCalled()
    })

    it('rejects a payload whose `completed` is null', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, activePhaseId: 'cockpit-prep', completed: null }),
      )
      expect(loadState()).toBeNull()
      expect(warn).toHaveBeenCalled()
    })

    it('rejects a completely non-object payload (e.g. a bare number)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(STORAGE_KEY, '42')
      expect(loadState()).toBeNull()
      expect(warn).toHaveBeenCalled()
    })
  })

  describe('saveState — defensive', () => {
    it('logs a warning and swallows the error when localStorage throws', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError')
        })

      expect(() => saveState(sampleState)).not.toThrow()
      expect(warn).toHaveBeenCalled()
      setItem.mockRestore()
    })
  })
})
