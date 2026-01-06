import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Controls Store
 * Manages compliance controls state
 */
export const useControlsStore = create(
  devtools(
    (set, get) => ({
      // ============================================================
      // Controls Data
      // ============================================================
      controls: [],
      filteredControls: [],
      isLoading: false,
      error: null,
      
      // Set controls
      setControls: (controls) => set({ 
        controls,
        filteredControls: controls 
      }),
      
      // Add control
      addControl: (control) => set((state) => ({ 
        controls: [...state.controls, control],
        filteredControls: [...state.filteredControls, control]
      })),
      
      // Update control
      updateControl: (controlId, updates) => set((state) => ({
        controls: state.controls.map(c => 
          c.id === controlId ? { ...c, ...updates } : c
        ),
        filteredControls: state.filteredControls.map(c => 
          c.id === controlId ? { ...c, ...updates } : c
        )
      })),
      
      // Remove control
      removeControl: (controlId) => set((state) => ({
        controls: state.controls.filter(c => c.id !== controlId),
        filteredControls: state.filteredControls.filter(c => c.id !== controlId)
      })),
      
      // Bulk update controls
      bulkUpdateControls: (controlIds, updates) => set((state) => ({
        controls: state.controls.map(c => 
          controlIds.includes(c.id) ? { ...c, ...updates } : c
        ),
        filteredControls: state.filteredControls.map(c => 
          controlIds.includes(c.id) ? { ...c, ...updates } : c
        )
      })),
      
      // ============================================================
      // Filtering
      // ============================================================
      searchTerm: '',
      statusFilter: 'ALL',
      frameworkFilter: 'ALL',
      priorityFilter: 'ALL',
      
      setSearchTerm: (term) => {
        set({ searchTerm: term });
        get().applyFilters();
      },
      
      setStatusFilter: (status) => {
        set({ statusFilter: status });
        get().applyFilters();
      },
      
      setFrameworkFilter: (framework) => {
        set({ frameworkFilter: framework });
        get().applyFilters();
      },
      
      setPriorityFilter: (priority) => {
        set({ priorityFilter: priority });
        get().applyFilters();
      },
      
      clearFilters: () => {
        set({
          searchTerm: '',
          statusFilter: 'ALL',
          frameworkFilter: 'ALL',
          priorityFilter: 'ALL',
          filteredControls: get().controls
        });
      },
      
      applyFilters: () => {
        const state = get();
        let filtered = [...state.controls];
        
        // Search filter
        if (state.searchTerm) {
          const term = state.searchTerm.toLowerCase();
          filtered = filtered.filter(c => 
            c.id?.toLowerCase().includes(term) ||
            c.control_name?.toLowerCase().includes(term) ||
            c.description?.toLowerCase().includes(term) ||
            c.category?.toLowerCase().includes(term)
          );
        }
        
        // Status filter
        if (state.statusFilter !== 'ALL') {
          filtered = filtered.filter(c => c.status === state.statusFilter);
        }
        
        // Framework filter
        if (state.frameworkFilter !== 'ALL') {
          filtered = filtered.filter(c => 
            c.frameworks?.includes(state.frameworkFilter)
          );
        }
        
        // Priority filter
        if (state.priorityFilter !== 'ALL') {
          filtered = filtered.filter(c => c.priority === state.priorityFilter);
        }
        
        set({ filteredControls: filtered });
      },
      
      // ============================================================
      // Selection State
      // ============================================================
      selectedControlIds: new Set(),
      
      selectControl: (controlId) => set((state) => {
        const newSelected = new Set(state.selectedControlIds);
        newSelected.add(controlId);
        return { selectedControlIds: newSelected };
      }),
      
      deselectControl: (controlId) => set((state) => {
        const newSelected = new Set(state.selectedControlIds);
        newSelected.delete(controlId);
        return { selectedControlIds: newSelected };
      }),
      
      toggleControlSelection: (controlId) => set((state) => {
        const newSelected = new Set(state.selectedControlIds);
        if (newSelected.has(controlId)) {
          newSelected.delete(controlId);
        } else {
          newSelected.add(controlId);
        }
        return { selectedControlIds: newSelected };
      }),
      
      selectAllControls: () => set((state) => ({
        selectedControlIds: new Set(state.filteredControls.map(c => c.id))
      })),
      
      clearControlSelection: () => set({ selectedControlIds: new Set() }),
      
      // ============================================================
      // Computed Values
      // ============================================================
      getControlById: (id) => get().controls.find(c => c.id === id),
      
      getControlStats: () => {
        const controls = get().controls;
        return {
          total: controls.length,
          implemented: controls.filter(c => 
            c.status === 'Implemented' || c.status === 'Compliant'
          ).length,
          partial: controls.filter(c => c.status === 'Partial').length,
          notImplemented: controls.filter(c => 
            c.status === 'Not Implemented' || c.status === 'Non-Compliant'
          ).length,
          vendorManaged: controls.filter(c => c.status === 'Vendor Managed').length,
          autoMapped: controls.filter(c => c.auto_mapped).length,
        };
      },
      
      getComplianceScore: () => {
        const stats = get().getControlStats();
        if (stats.total === 0) return 0;
        return Math.round(
          ((stats.implemented + stats.vendorManaged) / stats.total) * 100
        );
      },
      
      // ============================================================
      // Loading State
      // ============================================================
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'ControlsStore' }
  )
);

export default useControlsStore;
