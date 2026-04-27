import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersistenceRepository } from './PersistenceRepository';
import { type PersistedState } from '../data/persistence';

describe('PersistenceRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save and load state correctly', () => {
    const repo = new PersistenceRepository();
    const state: PersistedState = { 
      version: 2, 
      activePhaseId: 'test', 
      completed: { 'phase-1': ['item-1'] } 
    };
    repo.save(state);
    expect(repo.load()).toEqual(state);
  });
});
