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

export type PanelType = 'overhead' | 'glareshield' | 'instrument' | 'pedestal' | 'floor';

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

export const flightChecklists: FlightPhase[] = [
  {
    id: 'preliminary',
    label: 'Preliminary Cockpit Prep',
    items: [
      { id: 'p1', item: 'Battery 1 & 2', action: 'Auto/Check', panel: 'overhead', x: 45, y: 20, description: 'Check voltage > 25.5V and set to AUTO.' },
      { id: 'p2', item: 'External Power', action: 'As Required', panel: 'overhead', x: 50, y: 22, description: 'Connect External Power if available (AVAIL light).' },
      { id: 'p3', item: 'APU Fire Test', action: 'Performed', panel: 'overhead', x: 55, y: 15, description: 'Ensure APU FIRE light illuminates and CRC sounds.' },
      { id: 'p4', item: 'Standby Instruments', action: 'Set', panel: 'instrument', x: 30, y: 50, description: 'Set standby altimeter and airspeed.' },
      { id: 'p5', item: 'IRS Mode Select', action: 'NAV', panel: 'overhead', x: 42, y: 18, description: 'Set all three IRS to NAV after ~2 minutes alignment.' },
      { id: 'p6', item: 'Fuel Control Switches', action: 'Check', panel: 'pedestal', x: 50, y: 45, description: 'Ensure Fuel Control Switches are in CUT-OFF position.' },
      { id: 'p7', item: 'Weather Radar', action: 'Off', panel: 'overhead', x: 38, y: 23, description: 'Ensure Weather Radar is OFF.' },
    ]
  },
  {
    id: 'before-start',
    label: 'Before Start',
    items: [
      { id: 'bs1', item: 'ADIRS', action: 'NAV', panel: 'overhead', x: 45, y: 15, description: 'Turn all three ADIRS to NAV.' },
      { id: 'bs2', item: 'Fuel Quantity', action: 'Checked', panel: 'instrument', x: 50, y: 65, description: 'Verify fuel on board matches flight plan.' },
      { id: 'bs3', item: 'Seat Belts', action: 'On', panel: 'overhead', x: 48, y: 28, description: 'Set Seat Belts sign to ON.' },
      { id: 'bs4', item: 'Beacon', action: 'On', panel: 'overhead', x: 55, y: 25, description: 'Turn Beacon ON before pushback/start.' },
      { id: 'bs5', item: 'Flight Controls', action: 'Checked', panel: 'pedestal', x: 60, y: 50, description: 'Check full and free movement, verify green range.' },
      { id: 'bs6', item: 'Transponder', action: 'Set', panel: 'overhead', x: 60, y: 20, description: 'Set to appropriate code and mode (e.g., STBY or ON).' },
      { id: 'bs7', item: 'Emergency Exit Lights', action: 'Armed', panel: 'overhead', x: 65, y: 25, description: 'Arm Emergency Exit Lights.' },
      { id: 'bs8', item: 'Hydraulic Pumps', action: 'As Required', panel: 'overhead', x: 47, y: 23, description: 'Set hydraulic pumps as per QRH.' },
    ]
  },
  {
    id: 'after-start',
    label: 'After Start',
    items: [
      { id: 'as1', item: 'Anti-Ice', action: 'As Required', panel: 'overhead', x: 40, y: 25, description: 'Set Engine and Wing Anti-Ice based on conditions.' },
      { id: 'as2', item: 'APU Bleed', action: 'Off', panel: 'overhead', x: 50, y: 28, description: 'Turn APU Bleed OFF after engine start.' },
      { id: 'as3', item: 'ECAM Status', action: 'Checked', panel: 'instrument', x: 50, y: 60, description: 'Review ECAM status for any warnings or cautions.' },
      { id: 'as4', item: 'Navigation Source', action: 'Set', panel: 'glareshield', x: 50, y: 30, description: 'Set Navigation source to GPS or IRS as appropriate.' },
      { id: 'as5', item: 'Flight Director', action: 'On', panel: 'glareshield', x: 50, y: 40, description: 'Turn Flight Director ON.' },
      { id: 'as6', item: 'Autobrake', action: 'Set', panel: 'pedestal', x: 70, y: 50, description: 'Set Autobrake to RTO (Rejected Takeoff) if applicable for pushback.' },
      { id: 'as7', item: 'Yaw Damper', action: 'On', panel: 'overhead', x: 47, y: 27, description: 'Turn Yaw Damper ON.' },
    ]
  },
  {
    id: 'taxi',
    label: 'Taxi',
    items: [
      { id: 't1', item: 'Flaps', action: 'Set', panel: 'instrument', x: 50, y: 75, description: 'Set Flaps to takeoff setting (e.g., Flaps 1 or 2).' },
      { id: 't2', item: 'Autobrake', action: 'Set', panel: 'pedestal', x: 70, y: 50, description: 'Set Autobrake to RTO (Rejected Takeoff).' },
      { id: 't3', item: 'Ground Spoilers', action: 'Armed', panel: 'pedestal', x: 75, y: 55, description: 'Arm Ground Spoilers lever.' },
      { id: 't4', item: 'TCAS', action: 'Set', panel: 'glareshield', x: 60, y: 35, description: 'Set TCAS to TA/RA.' },
      { id: 't5', item: 'Weather Radar', action: 'Off', panel: 'overhead', x: 38, y: 23, description: 'Turn Weather Radar OFF for taxi.' },
      { id: 't6', item: 'Strobe Lights', action: 'On', panel: 'overhead', x: 42, y: 22, description: 'Turn Strobe lights ON for taxi.' },
      { id: 't7', item: 'Flight Instruments', action: 'Set', panel: 'glareshield', x: 50, y: 35, description: 'Verify flight instruments (altimeter, airspeed, VSI) are set correctly.' },
      { id: 't8', item: 'PFD/ND Settings', action: 'Configure', panel: 'glareshield', x: 50, y: 35, description: 'Configure PFD/ND (e.g., speed, altitude bugs, weather display).' },
    ]
  },
  {
    id: 'takeoff',
    label: 'Takeoff',
    items: [
      { id: 'to1', item: 'Thrust Levers', action: 'Set', panel: 'pedestal', x: 55, y: 55, description: 'Advance Thrust Levers to TOGA.' },
      { id: 'to2', item: 'V1 Callout', action: 'Confirm', panel: 'instrument', x: 50, y: 45, description: 'Confirm V1 callout.' },
      { id: 'to3', item: 'Rotate', action: 'Perform', panel: 'pedestal', x: 55, y: 55, description: 'Rotate aircraft at Vr.' },
      { id: 'to4', item: 'Gear', action: 'Up', panel: 'pedestal', x: 65, y: 50, description: 'Retract Landing Gear.' },
      { id: 'to5', item: 'Autopilot', action: 'Engage', panel: 'glareshield', x: 50, y: 40, description: 'Engage Autopilot after positive rate of climb.' },
      { id: 'to6', item: 'Autothrust', action: 'Engage', panel: 'glareshield', x: 50, y: 45, description: 'Engage Autothrust.' },
      { id: 'to7', item: 'Flaps', action: 'Up', panel: 'instrument', x: 50, y: 75, description: 'Retract flaps incrementally on schedule.' },
      { id: 'to8', item: 'ECAM Status', action: 'Checked', panel: 'instrument', x: 50, y: 60, description: 'Review ECAM status for any warnings or cautions.' },
    ]
  },
  {
    id: 'climb',
    label: 'Climb',
    items: [
      { id: 'c1', item: 'Climb Profile', action: 'Set', panel: 'glareshield', x: 50, y: 40, description: 'Set climb profile in the Flight Management Computer (FMC).' },
      { id: 'c2', item: 'Autobrake', action: 'Off', panel: 'pedestal', x: 70, y: 50, description: 'Disarm Autobrake.' },
      { id: 'c3', item: 'Seat Belts', action: 'Off', panel: 'overhead', x: 48, y: 28, description: 'Set Seat Belts sign to OFF when appropriate.' },
      { id: 'c4', item: 'ECAM Status', action: 'Checked', panel: 'instrument', x: 50, y: 60, description: 'Review ECAM status for any anomalies.' },
      { id: 'c5', item: 'FMS Speed', action: 'Set', panel: 'glareshield', x: 50, y: 40, description: 'Set speed in the FMC for climb.' },
      { id: 'c6', item: 'Landing Gear', action: 'Up', panel: 'pedestal', x: 65, y: 50, description: 'Ensure Landing Gear is UP.' },
    ]
  },
  {
    id: 'cruise',
    label: 'Cruise',
    items: [
      { id: 'cr1', item: 'Autobrake', action: 'Disarmed', panel: 'pedestal', x: 70, y: 50, description: 'Ensure Autobrake is disarmed.' },
      { id: 'cr2', item: 'Fuel Crossfeed', action: 'As Required', panel: 'overhead', x: 48, y: 25, description: 'Check fuel crossfeed valve position and fuel levels.' },
      { id: 'cr3', item: 'IMC (Instrument Meteorological Conditions)', action: 'Navigated', panel: 'glareshield', x: 50, y: 40, description: 'Maintain cleared altitude and heading.' },
      { id: 'cr4', item: 'Weather', action: 'Monitor', panel: 'glareshield', x: 50, y: 35, description: 'Monitor weather radar and reports.' },
      { id: 'cr5', item: 'FMS', action: 'Check', panel: 'glareshield', x: 50, y: 40, description: 'Periodically check FMS for route and ETA.' },
    ]
  },
  {
    id: 'descent',
    label: 'Descent',
    items: [
      { id: 'd1', item: 'Descent Profile', action: 'Set', panel: 'glareshield', x: 50, y: 40, description: 'Set descent profile in the FMC.' },
      { id: 'd2', item: 'Landing Gear', action: 'Down', panel: 'pedestal', x: 65, y: 50, description: 'Extend Landing Gear at the appropriate altitude.' },
      { id: 'd3', item: 'Flaps', action: 'Set', panel: 'instrument', x: 50, y: 75, description: 'Set flaps according to speed schedule.' },
      { id: 'd4', item: 'Autobrake', action: 'Set', panel: 'pedestal', x: 70, y: 50, description: 'Set Autobrake to desired landing setting.' },
      { id: 'd5', item: 'Approach Briefing', action: 'Performed', panel: 'instrument', x: 50, y: 55, description: 'Conduct approach briefing including altitudes, frequencies, and missed approach procedure.' },
      { id: 'd6', item: 'Approach Lights', action: 'On', panel: 'overhead', x: 38, y: 21, description: 'Turn Approach Lights ON.' },
    ]
  },
  {
    id: 'approach',
    label: 'Approach',
    items: [
      { id: 'a1', item: 'Approach Mode', action: 'Engage', panel: 'glareshield', x: 50, y: 40, description: 'Engage Approach mode on the Autopilot when established.' },
      { id: 'a2', item: 'Landing Lights', action: 'On', panel: 'overhead', x: 38, y: 21, description: 'Turn Landing Lights ON.' },
      { id: 'a3', item: 'Spoilers', action: 'Armed', panel: 'pedestal', x: 75, y: 55, description: 'Arm Spoilers (if not already armed).' },
      { id: 'a4', item: 'Autobrake', action: 'Set', panel: 'pedestal', x: 70, y: 50, description: 'Confirm Autobrake setting.' },
      { id: 'a5', item: 'ILS Frequency', action: 'Set', panel: 'glareshield', x: 50, y: 35, description: 'Tune ILS frequency in the NAV radios.' },
      { id: 'a6', item: 'MDA/DA', action: 'Set', panel: 'glareshield', x: 50, y: 40, description: 'Set Minimums (MDA/DA) on the PFD.' },
    ]
  },
  {
    id: 'landing',
    label: 'Landing',
    items: [
      { id: 'l1', item: 'Autobrake', action: 'Disengage', panel: 'pedestal', x: 70, y: 50, description: 'Autobrake disengages automatically on touchdown.' },
      { id: 'l2', item: 'Reverse Thrust', action: 'Apply', panel: 'pedestal', x: 55, y: 55, description: 'Apply reverse thrust immediately after touchdown.' },
      { id: 'l3', item: 'Brakes', action: 'Apply', panel: 'pedestal', x: 65, y: 50, description: 'Apply manual braking if necessary.' },
      { id: 'l4', item: 'Speedbrakes', action: 'Retract', panel: 'pedestal', x: 75, y: 55, description: 'Retract speedbrakes.' },
      { id: 'l5', item: 'Exit Taxiway', action: 'Clear', panel: 'instrument', x: 50, y: 70, description: 'Exit the runway at the designated taxiway speed.' },
      { id: 'l6', item: 'Landing Lights', action: 'Off', panel: 'overhead', x: 38, y: 21, description: 'Turn Landing Lights OFF after exiting the runway.' },
    ]
  },
  {
    id: 'after-landing',
    label: 'After Landing',
    items: [
      { id: 'al1', item: 'Landing Lights', action: 'Off', panel: 'overhead', x: 38, y: 21, description: 'Turn Landing Lights OFF after exiting the runway.' },
      { id: 'al2', item: 'Spoilers', action: 'Retract', panel: 'pedestal', x: 75, y: 55, description: 'Ensure spoilers are retracted.' },
      { id: 'al3', item: 'Autobrake', action: 'Off', panel: 'pedestal', x: 70, y: 50, description: 'Ensure Autobrake is off.' },
      { id: 'al4', item: 'Strobe Lights', action: 'Off', panel: 'overhead', x: 42, y: 22, description: 'Turn Strobe lights OFF.' },
      { id: 'al5', item: 'Seat Belts', action: 'On', panel: 'overhead', x: 48, y: 28, description: 'Set Seat Belts sign to ON for taxi.' },
      { id: 'al6', item: 'Parking Brake', action: 'Set', panel: 'pedestal', x: 65, y: 50, description: 'Set Parking Brake.' },
    ]
  },
  {
    id: 'shutdown',
    label: 'Shutdown',
    items: [
      { id: 's1', item: 'APU', action: 'Start', panel: 'overhead', x: 55, y: 15, description: 'Start APU if ground power is not available.' },
      { id: 's2', item: 'Engine 1 & 2', action: 'Off', panel: 'overhead', x: 50, y: 25, description: 'Shutdown Engines.' },
      { id: 's3', item: 'External Power', action: 'Connect', panel: 'overhead', x: 50, y: 22, description: 'Connect External Power if APU is not used.' },
      { id: 's4', item: 'Beacon', action: 'Off', panel: 'overhead', x: 55, y: 25, description: 'Turn Beacon OFF.' },
      { id: 's5', item: 'Battery', action: 'Off', panel: 'overhead', x: 45, y: 20, description: 'Turn Batteries OFF.' },
      { id: 's6', item: 'Fuel Control Switches', action: 'Cut-off', panel: 'pedestal', x: 50, y: 45, description: 'Ensure Fuel Control Switches are in CUT-OFF.' },
      { id: 's7', item: 'Emergency Exit Lights', action: 'Off', panel: 'overhead', x: 65, y: 25, description: 'Turn Emergency Exit Lights OFF.' },
    ]
  }
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
  APU: 'Auxiliary Power Unit',
  IRS: 'Inertial Reference System',
  ADIRS: 'Air Data / Inertial Reference System',
  ECAM: 'Electronic Centralized Aircraft Monitor',
  PFD: 'Primary Flight Display',
  ND: 'Navigation Display',
  ILS: 'Instrument Landing System',
  MDA: 'Minimum Descent Altitude',
  DA: 'Decision Altitude',
  TCAS: 'Traffic Collision Avoidance System',
  FMS: 'Flight Management System',
  FMC: 'Flight Management Computer',
  TOGA: 'Take-Off / Go-Around (thrust detent)',
  QRH: 'Quick Reference Handbook',
  RTO: 'Rejected Take-Off',
  IMC: 'Instrument Meteorological Conditions',
  'TA/RA': 'Traffic Advisory / Resolution Advisory',
  'PFD/ND': 'Primary Flight Display / Navigation Display',
  'MDA/DA': 'Minimum Descent Altitude / Decision Altitude',
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
  '(' +
    Object.keys(ACRONYMS)
      .sort((a, b) => b.length - a.length)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|') +
    ')',
  'g',
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
    if (part === '') continue;
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
