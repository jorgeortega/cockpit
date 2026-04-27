import { 
  flightChecklists, 
  type FlightPhase, 
  type ChecklistItem, 
  type TextSegment,
  expandAcronyms 
} from '../data/checklist';

/**
 * CS Note: Service Pattern & Singleton Pattern
 * 
 * The Service Pattern encapsulates "Business Logic" and data access.
 * 
 * The Singleton Pattern ensures only one instance of this service exists 
 * throughout the application lifecycle. This is useful for shared state 
 * or expensive resources (like our indexed Map).
 * 
 * Optimization: Computational Complexity
 * - Array.find() is O(n) — in the worst case, it scans every element.
 * - Map.get() is O(1) — it uses a Hash Table to jump directly to the value.
 * For a large checklist, this optimization significantly improves performance.
 */
export class ChecklistService {
  private static instance: ChecklistService;
  private itemMap: Map<string, ChecklistItem> = new Map();

  /**
   * Private constructor to prevent direct instantiation.
   */
  private constructor() {
    this.indexItems();
  }

  /**
   * Static method to get the single instance of the service.
   */
  public static getInstance(): ChecklistService {
    if (!ChecklistService.instance) {
      ChecklistService.instance = new ChecklistService();
    }
    return ChecklistService.instance;
  }

  /**
   * Pre-indexes all checklist items for O(1) lookup.
   * Time Complexity: O(N) where N is the total number of items across all phases.
   * Space Complexity: O(N) to store the Map.
   */
  private indexItems() {
    flightChecklists.forEach(phase => {
      phase.items.forEach(item => {
        // We store items by their unique ID for fast retrieval.
        this.itemMap.set(item.id, item);
      });
    });
  }

  /**
   * Returns all flight phases.
   */
  getPhases(): FlightPhase[] {
    return flightChecklists;
  }

  /**
   * Finds a flight phase by its ID.
   * Time Complexity: O(P) where P is the number of phases.
   */
  getPhaseById(id: string): FlightPhase | undefined {
    return flightChecklists.find(p => p.id === id);
  }

  /**
   * Finds a specific checklist item by its ID.
   * Time Complexity: O(1) thanks to our pre-indexed Map.
   * 
   * @param id The unique ID of the item.
   */
  getItemById(id: string): ChecklistItem | undefined {
    return this.itemMap.get(id);
  }

  /**
   * Expands acronyms in a given text into a list of text segments.
   * This is part of our "Business Logic".
   * 
   * @param text The source text (e.g., "APU Fire")
   */
  expandText(text: string): TextSegment[] {
    return expandAcronyms(text);
  }
}
