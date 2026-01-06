import { describe, it, expect, beforeEach } from 'vitest';
import { useControlsStore } from './useControlsStore';

describe('useControlsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useControlsStore.setState({
      controls: [],
      filteredControls: [],
      searchTerm: '',
      statusFilter: 'ALL',
      frameworkFilter: 'ALL',
      priorityFilter: 'ALL',
      selectedControlIds: new Set(),
      isLoading: false,
      error: null,
    });
  });

  describe('setControls', () => {
    it('sets controls and filteredControls', () => {
      const mockControls = [
        { id: 'AC-1', control_name: 'Access Control Policy', status: 'Implemented' },
        { id: 'AC-2', control_name: 'Account Management', status: 'Partial' },
      ];

      useControlsStore.getState().setControls(mockControls);

      expect(useControlsStore.getState().controls).toEqual(mockControls);
      expect(useControlsStore.getState().filteredControls).toEqual(mockControls);
    });
  });

  describe('addControl', () => {
    it('adds a control to the list', () => {
      const newControl = { id: 'AC-1', control_name: 'Test Control', status: 'Partial' };

      useControlsStore.getState().addControl(newControl);

      expect(useControlsStore.getState().controls).toContainEqual(newControl);
    });
  });

  describe('updateControl', () => {
    it('updates a specific control', () => {
      useControlsStore.setState({
        controls: [
          { id: 'AC-1', control_name: 'Test', status: 'Partial' },
          { id: 'AC-2', control_name: 'Test 2', status: 'Not Implemented' },
        ],
        filteredControls: [
          { id: 'AC-1', control_name: 'Test', status: 'Partial' },
          { id: 'AC-2', control_name: 'Test 2', status: 'Not Implemented' },
        ],
      });

      useControlsStore.getState().updateControl('AC-1', { status: 'Implemented' });

      const control = useControlsStore.getState().controls.find(c => c.id === 'AC-1');
      expect(control.status).toBe('Implemented');
    });
  });

  describe('removeControl', () => {
    it('removes a control from the list', () => {
      useControlsStore.setState({
        controls: [
          { id: 'AC-1', control_name: 'Test', status: 'Partial' },
          { id: 'AC-2', control_name: 'Test 2', status: 'Implemented' },
        ],
        filteredControls: [
          { id: 'AC-1', control_name: 'Test', status: 'Partial' },
          { id: 'AC-2', control_name: 'Test 2', status: 'Implemented' },
        ],
      });

      useControlsStore.getState().removeControl('AC-1');

      expect(useControlsStore.getState().controls).toHaveLength(1);
      expect(useControlsStore.getState().controls[0].id).toBe('AC-2');
    });
  });

  describe('bulkUpdateControls', () => {
    it('updates multiple controls at once', () => {
      useControlsStore.setState({
        controls: [
          { id: 'AC-1', status: 'Partial' },
          { id: 'AC-2', status: 'Partial' },
          { id: 'AC-3', status: 'Implemented' },
        ],
        filteredControls: [
          { id: 'AC-1', status: 'Partial' },
          { id: 'AC-2', status: 'Partial' },
          { id: 'AC-3', status: 'Implemented' },
        ],
      });

      useControlsStore.getState().bulkUpdateControls(['AC-1', 'AC-2'], { status: 'Implemented' });

      const controls = useControlsStore.getState().controls;
      expect(controls.find(c => c.id === 'AC-1').status).toBe('Implemented');
      expect(controls.find(c => c.id === 'AC-2').status).toBe('Implemented');
      expect(controls.find(c => c.id === 'AC-3').status).toBe('Implemented'); // Unchanged
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      useControlsStore.setState({
        controls: [
          { id: 'AC-1', control_name: 'Access Control', status: 'Implemented', frameworks: ['NIST', 'SOC2'], priority: 'High' },
          { id: 'AC-2', control_name: 'Account Management', status: 'Partial', frameworks: ['NIST'], priority: 'Medium' },
          { id: 'IR-1', control_name: 'Incident Response', status: 'Not Implemented', frameworks: ['SOC2'], priority: 'High' },
        ],
        filteredControls: [
          { id: 'AC-1', control_name: 'Access Control', status: 'Implemented', frameworks: ['NIST', 'SOC2'], priority: 'High' },
          { id: 'AC-2', control_name: 'Account Management', status: 'Partial', frameworks: ['NIST'], priority: 'Medium' },
          { id: 'IR-1', control_name: 'Incident Response', status: 'Not Implemented', frameworks: ['SOC2'], priority: 'High' },
        ],
      });
    });

    it('filters by search term', () => {
      useControlsStore.getState().setSearchTerm('Access');

      const filtered = useControlsStore.getState().filteredControls;
      expect(filtered).toHaveLength(1); // Only Access Control matches
      expect(filtered[0].control_name).toBe('Access Control');
    });

    it('filters by status', () => {
      useControlsStore.getState().setStatusFilter('Implemented');

      const filtered = useControlsStore.getState().filteredControls;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('AC-1');
    });

    it('filters by framework', () => {
      useControlsStore.getState().setFrameworkFilter('SOC2');

      const filtered = useControlsStore.getState().filteredControls;
      expect(filtered).toHaveLength(2);
    });

    it('filters by priority', () => {
      useControlsStore.getState().setPriorityFilter('High');

      const filtered = useControlsStore.getState().filteredControls;
      expect(filtered).toHaveLength(2);
    });

    it('clears all filters', () => {
      useControlsStore.getState().setSearchTerm('test');
      useControlsStore.getState().setStatusFilter('Implemented');
      useControlsStore.getState().clearFilters();

      expect(useControlsStore.getState().searchTerm).toBe('');
      expect(useControlsStore.getState().statusFilter).toBe('ALL');
      expect(useControlsStore.getState().filteredControls).toHaveLength(3);
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      useControlsStore.setState({
        controls: [{ id: 'AC-1' }, { id: 'AC-2' }, { id: 'AC-3' }],
        filteredControls: [{ id: 'AC-1' }, { id: 'AC-2' }, { id: 'AC-3' }],
        selectedControlIds: new Set(),
      });
    });

    it('selects a control', () => {
      useControlsStore.getState().selectControl('AC-1');

      expect(useControlsStore.getState().selectedControlIds.has('AC-1')).toBe(true);
    });

    it('deselects a control', () => {
      useControlsStore.setState({ selectedControlIds: new Set(['AC-1']) });
      useControlsStore.getState().deselectControl('AC-1');

      expect(useControlsStore.getState().selectedControlIds.has('AC-1')).toBe(false);
    });

    it('toggles control selection', () => {
      useControlsStore.getState().toggleControlSelection('AC-1');
      expect(useControlsStore.getState().selectedControlIds.has('AC-1')).toBe(true);

      useControlsStore.getState().toggleControlSelection('AC-1');
      expect(useControlsStore.getState().selectedControlIds.has('AC-1')).toBe(false);
    });

    it('selects all controls', () => {
      useControlsStore.getState().selectAllControls();

      expect(useControlsStore.getState().selectedControlIds.size).toBe(3);
    });

    it('clears selection', () => {
      useControlsStore.setState({ selectedControlIds: new Set(['AC-1', 'AC-2']) });
      useControlsStore.getState().clearControlSelection();

      expect(useControlsStore.getState().selectedControlIds.size).toBe(0);
    });
  });

  describe('computed values', () => {
    it('getControlById returns correct control', () => {
      useControlsStore.setState({
        controls: [
          { id: 'AC-1', control_name: 'Test 1' },
          { id: 'AC-2', control_name: 'Test 2' },
        ],
      });

      const control = useControlsStore.getState().getControlById('AC-1');
      expect(control.control_name).toBe('Test 1');
    });

    it('getControlStats returns correct statistics', () => {
      useControlsStore.setState({
        controls: [
          { id: 'AC-1', status: 'Implemented' },
          { id: 'AC-2', status: 'Compliant' },
          { id: 'AC-3', status: 'Partial' },
          { id: 'AC-4', status: 'Not Implemented' },
          { id: 'AC-5', status: 'Vendor Managed' },
          { id: 'AC-6', status: 'Partial', auto_mapped: true },
        ],
      });

      const stats = useControlsStore.getState().getControlStats();

      expect(stats.total).toBe(6);
      expect(stats.implemented).toBe(2);
      expect(stats.partial).toBe(2);
      expect(stats.notImplemented).toBe(1);
      expect(stats.vendorManaged).toBe(1);
      expect(stats.autoMapped).toBe(1);
    });

    it('getComplianceScore calculates correctly', () => {
      useControlsStore.setState({
        controls: [
          { id: 'AC-1', status: 'Implemented' },
          { id: 'AC-2', status: 'Implemented' },
          { id: 'AC-3', status: 'Vendor Managed' },
          { id: 'AC-4', status: 'Partial' },
        ],
      });

      const score = useControlsStore.getState().getComplianceScore();
      expect(score).toBe(75); // 3 out of 4 = 75%
    });

    it('getComplianceScore returns 0 for empty controls', () => {
      useControlsStore.setState({ controls: [] });

      const score = useControlsStore.getState().getComplianceScore();
      expect(score).toBe(0);
    });
  });
});
