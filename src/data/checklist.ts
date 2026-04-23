// ---------------------------------------------------------------------------
// A320neo (Airbus A320 New Engine Option) flight-deck checklist data.
//
// Single source of truth for every flight phase the app recognises.
// Exports:
//   1. Domain types (PanelType, ChecklistItem, FlightPhase) — the shape.
//   2. The data itself (flightChecklists) — the content.
//   3. Lookup helpers (getPhaseById, getItemById) — accessors shared by every
//      consumer so callers never repeat a raw `.find(...)`.
//   4. DEFAULT_PHASE_ID — the initial phase the UI boots into.
//
// A separate data module keeps pure data + pure functions together: trivial to
// unit test, and trivial to swap later for a remote source (e.g. fetching
// checklists from an API). Components depend on the interface, not the store.
//
// Acronyms introduced in this file:
//   APU      = Auxiliary Power Unit
//   IRS      = Inertial Reference System
//   ADIRS    = Air Data / Inertial Reference System
//   ECAM     = Electronic Centralized Aircraft Monitor
//   PFD      = Primary Flight Display
//   ND       = Navigation Display
//   ILS      = Instrument Landing System
//   MDA/DA   = Minimum / Decision Altitude
//   TCAS     = Traffic Collision Avoidance System
//   FMC/FMS  = Flight Management Computer / System
//   TOGA     = Take-Off / Go-Around (thrust detent)
//   QRH      = Quick Reference Handbook
//   RTO      = Rejected Take-Off
//   IMC      = Instrument Meteorological Conditions
// ---------------------------------------------------------------------------

export type PanelType =
  | "overhead"
  | "glareshield"
  | "instrument"
  | "pedestal"
  | "floor"
  | "exterior"
  | "none";

export interface ChecklistItem {
  id: string;
  item: string;
  action: string;
  panel: PanelType;
  description?: string;
  x?: number; // % from left
  y?: number; // % from top
}

export interface FlightPhase {
  id: string;
  label: string;
  items: ChecklistItem[];
}

// Source: FlyByWire Simulations A32NX Checklist (1 APR 2024).
// https://github.com/flybywiresim/docs → pilots-corner/a32nx/.../FBW A32NX Checklist.pdf
//
// Hotspot coordinates default to the image centre (50, 50) as a placeholder;
// they are captured per item via the in-app Dev Mode tool and pasted back
// here. Keeping a default ensures the focused-jump watch has something to
// render until real coords are set.
export const flightChecklists: FlightPhase[] = [
  {
    id: "cockpit-prep",
    label: "Cockpit Preparation",
    items: [
      {
        id: "cp1",
        item: "Gear Pins and Covers",
        action: "Removed",
        panel: "exterior",
        x: 0,
        y: 0,
        description:
          "Verify landing gear safety pins and engine inlet/pitot covers are removed and stowed.",
      },
      {
        id: "cp2",
        item: "Fuel Quantity",
        action: "check ECAM flight plan",
        panel: "instrument",
        x: 45.98,
        y: 62.32,
        description:
          "Cross-check fuel on board against flight plan on the ECAM fuel page.",
      },
      {
        id: "cp3",
        item: "Seat Belts",
        action: "On",
        panel: "overhead",
        x: 51.87,
        y: 50.65,
        description: "Set Seat Belts sign to ON.",
      },
      {
        id: "cp4",
        item: "ADIRS",
        action: "NAV",
        panel: "overhead",
        x: 31.01,
        y: 33.28,
        description: "Set all three ADIRS rotary selectors to NAV.",
      },
      {
        id: "cp5",
        item: "Baro Ref",
        action: "QNH / STD (Both)",
        panel: "glareshield",
        x: 31.04,
        y: 55.23,
        description: "Set QNH / STD on both FCU baro knobs per clearance.",
      },
    ],
  },
  {
    id: "before-start",
    label: "Before Start",
    items: [
      {
        id: "bs1",
        item: "Parking Brake",
        action: "ground crew instructions",
        panel: "pedestal",
        x: 50.77,
        y: 94.62,
        description:
          "Confirm parking brake state per ground crew instructions.",
      },
      {
        id: "bs2",
        item: "T.O. Speeds & Thrust",
        action: "Set MCDU (Both)",
        panel: "pedestal",
        x: 41.01,
        y: 73.35,
        description:
          "Insert V-speeds and FLEX/TOGA thrust on the MCDU PERF TO page, both pilots.",
      },
      {
        id: "bs3",
        item: "Windows",
        action: "Closed (Both)",
        panel: "overhead",
        x: 0,
        y: 0,
        description: "Both cockpit windows closed and locked.",
      },
      {
        id: "bs4",
        item: "Beacon",
        action: "On",
        panel: "overhead",
        x: 42.28,
        y: 48.98,
        description: "Turn Beacon ON prior to pushback/start.",
      },
    ],
  },
  {
    id: "after-start",
    label: "After Start",
    items: [
      {
        id: "as1",
        item: "Anti Ice",
        action: "Set",
        panel: "overhead",
        x: 40.16,
        y: 47,
        description: "Set Engine and Wing Anti-Ice per conditions.",
      },
      {
        id: "as2",
        item: "ECAM Status",
        action: "Checked",
        panel: "instrument",
        x: 50.09,
        y: 59.45,
        description: "Review ECAM STATUS for any inop systems or cautions.",
      },
      {
        id: "as3",
        item: "Pitch Trim",
        action: "CG / TOW table",
        panel: "pedestal",
        x: 45.36,
        y: 81.77,
        description: "Set takeoff pitch trim from the CG / TOW table.",
      },
      {
        id: "as4",
        item: "Rudder Trim",
        action: "Neutral",
        panel: "pedestal",
        x: 51.08,
        y: 91.97,
        description: "Rudder trim to neutral / zero.",
      },
    ],
  },
  {
    id: "taxi",
    label: "Taxi",
    items: [
      {
        id: "tx1",
        item: "Flight Controls",
        action: "Checked (Both)",
        panel: "pedestal",
        x: 21.03,
        y: 74.35,
        description:
          "Full and free sidestick / rudder movement, green indications on the ECAM F/CTL page.",
      },
      {
        id: "tx2",
        item: "Flap Setting",
        action: "takeoff set (Both)",
        panel: "pedestal",
        x: 54.45,
        y: 89,
        description:
          "Set takeoff flap configuration on the flap lever; confirm on ECAM.",
      },
      {
        id: "tx3",
        item: "Radar & Pred W/S",
        action: "On & Auto",
        panel: "pedestal",
        x: 43.08,
        y: 88.13,
        description: "WXR ON and PRED W/S AUTO on the radar panel.",
      },
      {
        id: "tx4",
        item: "ENG Mode Sel",
        action: "NORM or IGN/START",
        panel: "overhead",
        x: 49.91,
        y: 87.8,
        description:
          "Select NORM or IGN/START on the engine mode selector per conditions.",
      },
      {
        id: "tx5",
        item: "ECAM Memo",
        action: "TO No Blue",
        panel: "instrument",
        x: 46.04,
        y: 59.43,
        description:
          "TO memo complete — no blue items remaining: AUTO BRK MAX, SIGNS ON, CABIN READY, SPLRS ARM, FLAPS TO, TO CONFIRM NORM.",
      },
      {
        id: "tx6",
        item: "Cabin",
        action: "Ready",
        panel: "none",
        x: 0,
        y: 0,
        description: "Cabin crew ready confirmation received.",
      },
    ],
  },
  {
    id: "line-up",
    label: "Line-Up",
    items: [
      {
        id: "lu1",
        item: "T.O. RWY",
        action: "PFD/ND (Both)",
        panel: "instrument",
        x: 30.73,
        y: 62.08,
        description: "Confirm takeoff runway against PFD/ND on both sides.",
      },
      {
        id: "lu2",
        item: "TCAS",
        action: "TA/RA",
        panel: "pedestal",
        x: 57.11,
        y: 86.45,
        description: "Set TCAS mode (e.g. TA/RA) on the ATC/TCAS panel.",
      },
      {
        id: "lu3",
        item: "Packs 1 & 2",
        action: "Set",
        panel: "overhead",
        x: 41.41,
        y: 43.37,
        description:
          "Set both air-conditioning packs per takeoff performance requirements.",
      },
    ],
  },
  {
    id: "approach",
    label: "Approach",
    items: [
      {
        id: "ap1",
        item: "Baro Ref",
        action: "Set dest. QNH (Both)",
        panel: "glareshield",
        x: 31.04,
        y: 55.23,
        description: "Set destination QNH on both FCU baro knobs.",
      },
      {
        id: "ap2",
        item: "Seat Belts",
        action: "On",
        panel: "overhead",
        x: 51.87,
        y: 50.65,
        description: "Seat belt sign ON.",
      },
      {
        id: "ap3",
        item: "Minimum",
        action: "Set PFD",
        panel: "instrument",
        x: 30.73,
        y: 62.08,
        description: "Set MDA/DA minimum on the PFD.",
      },
      {
        id: "ap4",
        item: "Auto Brake",
        action: "Arm",
        panel: "pedestal",
        x: 58.89,
        y: 60.99,
        description: "Arm LO / MED / HI autobrake per landing performance.",
      },
      {
        id: "ap5",
        item: "ENG Mode Sel",
        action: "As Rqrd",
        panel: "overhead",
        x: 50,
        y: 50,
        description: "Select IGN/START or NORM per weather conditions.",
      },
    ],
  },
  {
    id: "landing",
    label: "Landing",
    items: [
      {
        id: "ld1",
        item: "ECAM Memo",
        action: "LDG No Blue",
        panel: "instrument",
        x: 50,
        y: 50,
        description:
          "Landing memo complete — no blue items remaining: LDG GEAR DN, SIGNS ON, CABIN READY, SPLRS ARM, FLAPS SET.",
      },
      {
        id: "ld2",
        item: "Cabin",
        action: "Ready",
        panel: "none",
        x: 0,
        y: 0,
        description: "Cabin crew ready for landing.",
      },
    ],
  },
  {
    id: "after-landing",
    label: "After Landing",
    items: [
      {
        id: "al1",
        item: "Radar & Pred W/S",
        action: "Off",
        panel: "pedestal",
        x: 43.08,
        y: 88.13,
        description: "WXR and PRED W/S OFF after clearing the runway.",
      },
    ],
  },
  {
    id: "parking",
    label: "Parking",
    items: [
      {
        id: "pk1",
        item: "Park BRK or Chocks",
        action: "Set",
        panel: "pedestal",
        x: 50.77,
        y: 94.62,
        description:
          "Parking brake applied or wheel chocks confirmed in place.",
      },
      {
        id: "pk2",
        item: "Engines",
        action: "Off",
        panel: "pedestal",
        x: 50,
        y: 50,
        description: "Both ENG master switches OFF.",
      },
      {
        id: "pk3",
        item: "Wings Light",
        action: "Off",
        panel: "overhead",
        x: 50,
        y: 50,
        description: "Wing inspection light OFF.",
      },
      {
        id: "pk4",
        item: "Fuel Pumps",
        action: "Off",
        panel: "overhead",
        x: 50,
        y: 50,
        description: "All fuel pumps OFF.",
      },
      {
        id: "pk5",
        item: "Yellow Elec Pump",
        action: "Off",
        panel: "overhead",
        x: 50,
        y: 50,
        description: "Yellow electric hydraulic pump OFF.",
      },
    ],
  },
  {
    id: "securing",
    label: "Securing the Aircraft",
    items: [
      {
        id: "sa1",
        item: "Oxygen",
        action: "Off",
        panel: "overhead",
        x: 50,
        y: 50,
        description: "Crew oxygen supply OFF.",
      },
      {
        id: "sa2",
        item: "Emer Exit Lt",
        action: "Off",
        panel: "overhead",
        x: 50,
        y: 50,
        description: "Emergency exit lights OFF.",
      },
      {
        id: "sa3",
        item: "Batteries",
        action: "Off",
        panel: "overhead",
        x: 50,
        y: 50,
        description: "Both batteries OFF.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
//
// Thin wrappers around `flightChecklists.find(...)` that give callers a
// consistent, readable API and a single place to change if the backing store
// ever changes (e.g. a Map for O(1) lookup once the list grows).
//
// Both helpers return `undefined` on miss rather than throwing. Consumers can
// then write `getPhaseById(id)?.items ?? []` at the render site and avoid
// try/catch entirely.
// ---------------------------------------------------------------------------

/** Find a flight phase by its id, or `undefined` if the id is unknown. */
export function getPhaseById(phaseId: string): FlightPhase | undefined {
  return flightChecklists.find((p) => p.id === phaseId);
}

/** Find an item inside a phase. Returns `undefined` if either id is unknown. */
export function getItemById(
  phaseId: string,
  itemId: string,
): ChecklistItem | undefined {
  return getPhaseById(phaseId)?.items.find((i) => i.id === itemId);
}

/**
 * The phase the UI boots into when no saved state is present.
 * Derived from the first entry so reordering `flightChecklists` is enough to
 * change the default — there is no second place to update.
 */
export const DEFAULT_PHASE_ID: string = flightChecklists[0].id;

// ---------------------------------------------------------------------------
// Acronyms used in checklist labels.
//
// Kept as a plain Record so lookups are O(1) and JSON-serialisable. The keys
// are the exact strings we expect to appear inside an item's label or action
// (word-boundary matched) — see `expandAcronyms` below.
//
// To add a new acronym, append an entry here. The UI automatically wraps it
// in an `<abbr title="...">` tag on next render.
// ---------------------------------------------------------------------------
export const ACRONYMS: Record<string, string> = {
  APU: "Auxiliary Power Unit",
  IRS: "Inertial Reference System",
  ADIRS: "Air Data / Inertial Reference System",
  ECAM: "Electronic Centralized Aircraft Monitor",
  PFD: "Primary Flight Display",
  ND: "Navigation Display",
  ILS: "Instrument Landing System",
  MDA: "Minimum Descent Altitude",
  DA: "Decision Altitude",
  TCAS: "Traffic Collision Avoidance System",
  FMS: "Flight Management System",
  FMC: "Flight Management Computer",
  TOGA: "Take-Off / Go-Around (thrust detent)",
  QRH: "Quick Reference Handbook",
  RTO: "Rejected Take-Off",
  IMC: "Instrument Meteorological Conditions",
  "TA/RA": "Traffic Advisory / Resolution Advisory",
  "PFD/ND": "Primary Flight Display / Navigation Display",
  "MDA/DA": "Minimum Descent Altitude / Decision Altitude",
};

/**
 * A single chunk of a label: plain text, or text with a tooltip title.
 *
 * The UI renders `{ text }` as a plain `<span>` and `{ text, title }` as
 * `<abbr title="...">text</abbr>` — hover reveals the expansion and screen
 * readers announce it.
 */
export interface TextSegment {
  text: string;
  title?: string;
}

// Build the matcher once. Escapes any regex metacharacters in each key (e.g.
// the "/" in "TA/RA") and joins with `|`. Longest-first order guarantees
// that "MDA/DA" wins over "MDA" when both are eligible.
const ACRONYM_PATTERN = new RegExp(
  "(" +
    Object.keys(ACRONYMS)
      .sort((a, b) => b.length - a.length)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|") +
    ")",
  "g",
);

/**
 * Split a label into alternating plain / annotated segments.
 *
 * Example: `expandAcronyms('APU Fire Test')` →
 *   [{ text: 'APU', title: 'Auxiliary Power Unit' },
 *    { text: ' ' },
 *    { text: 'Fire' },
 *    { text: ' ' },
 *    { text: 'Test' }]
 *
 * Returning segments (rather than HTML) keeps the rendering decision in the
 * template and avoids the `v-html` escape hatch.
 */
export function expandAcronyms(source: string): TextSegment[] {
  if (source.length === 0) return [];
  const out: TextSegment[] = [];
  // Split on the acronym pattern; odd indices are the matches (capture group),
  // even indices are the surrounding plain text (possibly empty strings we
  // skip to keep the output compact).
  const parts = source.split(ACRONYM_PATTERN);
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part === "") continue;
    const isAcronym = i % 2 === 1; // split() puts captures on odd indices.
    if (isAcronym) {
      out.push({ text: part, title: ACRONYMS[part] });
    } else {
      // Break plain runs into individual words + whitespace so rendered
      // output is one segment per token — easier to test and style. The
      // regex matches any non-empty string, and we've already skipped the
      // empty case above, so `match` is guaranteed to return a non-null
      // array here (TS can't infer that).
      const tokens = part.match(/\s+|\S+/g) as RegExpMatchArray;
      for (const token of tokens) out.push({ text: token });
    }
  }
  return out;
}
