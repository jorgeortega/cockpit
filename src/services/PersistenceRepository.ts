import { type PersistedState, STORAGE_KEY } from '../data/persistence';

/**
 * CS Note: Repository Pattern
 * 
 * A Repository mediates between the domain and data mapping layers, acting 
 * like an in-memory collection of domain objects. 
 * 
 * Why? It decouples the application from the specific storage technology 
 * (LocalStorage). If we ever switch to IndexDB or a Remote API, we only 
 * change this file.
 * 
 * In this implementation, we encapsulate the logic for reading/writing 
 * to LocalStorage, ensuring the rest of the application doesn't need 
 * to worry about JSON serialization or storage keys.
 */
export class PersistenceRepository {
  /**
   * Persist the application state to storage.
   * Time Complexity: O(S) where S is the size of the state object (serialization overhead).
   * 
   * @param state The state object to save.
   */
  save(state: PersistedState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[PersistenceRepository] Failed to save state to LocalStorage:', e);
    }
  }

  /**
   * Load the application state from storage.
   * Returns null if no state is found or if parsing fails.
   */
  load(): PersistedState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      
      const parsed = JSON.parse(raw);
      // We could add validation here, or reuse the validation from persistence.ts
      return parsed as PersistedState;
    } catch (e) {
      console.warn('[PersistenceRepository] Failed to load/parse state from LocalStorage:', e);
      return null;
    }
  }

  /**
   * Clear the persisted state from storage.
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
