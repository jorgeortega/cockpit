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
    ]
  },
  {
    id: 'after-start',
    label: 'After Start',
    items: [
      { id: 'as1', item: 'Anti-Ice', action: 'As Required', panel: 'overhead', x: 40, y: 25, description: 'Set Engine and Wing Anti-Ice based on conditions.' },
      { id: 'as2', item: 'APU Bleed', action: 'Off', panel: 'overhead', x: 50, y: 28, description: 'Turn APU Bleed OFF after engine start.' },
      { id: 'as3', item: 'ECAM Status', action: 'Checked', panel: 'instrument', x: 50, y: 60, description: 'Review ECAM status for any warnings or cautions.' },
    ]
  }
];
