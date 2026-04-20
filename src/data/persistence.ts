// ---------------------------------------------------------------------------
// localStorage persistence for the cockpit simulator.
//
// Responsibilities:
//   - Define the on-disk schema (PersistedState) and its version.
//   - Serialise/deserialise between the Map<string, Set<string>> used at
//     runtime and the plain JSON-friendly shape stored on disk.
//   - Read / write the blob defensively: corrupt JSON, a wrong version, or
//     a localStorage failure (quota exceeded, private mode) all surface as a
//     `null` load + a console warning — never a thrown error that would
//     crash the UI on boot.
//
// The storage key is versioned (`cockpit-sim:v2`). When the schema changes
// in a backwards-incompatible way, bump the version; the old blob is left in
// place under its old key so nothing is silently migrated or lost.
// v2 — phase and item ids realigned to the FBW A32NX checklist (2026-04).
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'cockpit-sim:v2';

export interface PersistedState {
  version: 2;
  activePhaseId: string;
  /**
   * Keyed by phase id → array of completed item ids. An array (rather than a
   * Set) is used because `Set` does not survive `JSON.stringify`. Callers
   * convert back to `Set` via `deserialize`.
   */
  completed: Record<string, string[]>;
}

/** Convert the runtime `Map<string, Set<string>>` to a JSON-friendly object. */
export function serialize(
  completed: Map<string, Set<string>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [phaseId, ids] of completed) {
    out[phaseId] = Array.from(ids);
  }
  return out;
}

/** Inverse of `serialize`. */
export function deserialize(
  record: Record<string, string[]>,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const [phaseId, ids] of Object.entries(record)) {
    map.set(phaseId, new Set(ids));
  }
  return map;
}

/**
 * Narrow `unknown` to `PersistedState` or `null`.
 *
 * Kept strict so a stray shape (e.g. a partial write from an old tab) is
 * rejected rather than accidentally loaded and patched up in place.
 */
function isValidState(raw: unknown): raw is PersistedState {
  if (raw === null || typeof raw !== 'object') return false;
  const s = raw as Partial<PersistedState>;
  if (s.version !== 2) return false;
  if (typeof s.activePhaseId !== 'string') return false;
  if (s.completed === null || typeof s.completed !== 'object') return false;
  for (const ids of Object.values(s.completed)) {
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      return false;
    }
  }
  return true;
}

/**
 * Read persisted state.
 *
 * Returns `null` in three cases, all of which are logged:
 *   - Nothing has been saved yet.
 *   - The stored JSON is malformed.
 *   - The stored JSON is parseable but has the wrong version or shape.
 *
 * In the latter two cases the key is also cleared so subsequent loads don't
 * keep hitting the bad blob.
 */
export function loadState(): PersistedState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn('[cockpit-sim] Discarding unparsable localStorage:', err);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  if (!isValidState(parsed)) {
    console.warn(
      '[cockpit-sim] Discarding localStorage with unexpected shape:',
      parsed,
    );
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  return parsed;
}

/**
 * Write persisted state. Errors (quota, private-mode restrictions) are logged
 * and swallowed — a broken disk should not break the app.
 */
export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[cockpit-sim] Failed to persist state:', err);
  }
}
