import { describe, it, expect } from 'vitest';
import { ChecklistService } from './ChecklistService';

describe('ChecklistService', () => {
  const service = ChecklistService.getInstance();

  it('should find items with O(1) complexity (simulated via Map lookup)', () => {
    // cp2 is "Fuel Quantity" in "cockpit-prep"
    const item = service.getItemById('cp2');
    expect(item?.item).toBe('Fuel Quantity');
  });

  it('should expand acronyms correctly', () => {
    const segments = service.expandText('APU Fire');
    // First segment should be APU with title
    expect(segments[0]).toEqual({ text: 'APU', title: 'Auxiliary Power Unit' });
  });

  it('should find phases by id', () => {
    const phase = service.getPhaseById('cockpit-prep');
    expect(phase?.label).toBe('Cockpit Preparation');
  });
});
