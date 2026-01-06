import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Alerts Store
 * Manages compliance alerts and notifications state
 */
export const useAlertsStore = create(
  devtools(
    (set, get) => ({
      // ============================================================
      // Alerts Data
      // ============================================================
      alerts: [],
      isLoading: false,
      error: null,
      
      // Set alerts
      setAlerts: (alerts) => set({ alerts }),
      
      // Add alert
      addAlert: (alert) => set((state) => ({ 
        alerts: [alert, ...state.alerts]
      })),
      
      // Update alert
      updateAlert: (alertId, updates) => set((state) => ({
        alerts: state.alerts.map(a => 
          a.id === alertId ? { ...a, ...updates } : a
        )
      })),
      
      // Remove alert
      removeAlert: (alertId) => set((state) => ({
        alerts: state.alerts.filter(a => a.id !== alertId)
      })),
      
      // ============================================================
      // Alert Actions
      // ============================================================
      acknowledgeAlert: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map(a => 
            a.id === alertId 
              ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
              : a
          )
        }));
      },
      
      resolveAlert: (alertId, resolution) => {
        set((state) => ({
          alerts: state.alerts.map(a => 
            a.id === alertId 
              ? { 
                  ...a, 
                  status: 'resolved', 
                  resolved_at: new Date().toISOString(),
                  resolution_notes: resolution?.notes,
                  resolution_actions: resolution?.actions
                }
              : a
          )
        }));
      },
      
      // ============================================================
      // Filtering
      // ============================================================
      severityFilter: 'ALL',
      statusFilter: 'ALL',
      frameworkFilter: 'ALL',
      
      setSeverityFilter: (severity) => set({ severityFilter: severity }),
      setStatusFilter: (status) => set({ statusFilter: status }),
      setFrameworkFilter: (framework) => set({ frameworkFilter: framework }),
      
      clearFilters: () => set({
        severityFilter: 'ALL',
        statusFilter: 'ALL',
        frameworkFilter: 'ALL'
      }),
      
      // Get filtered alerts
      getFilteredAlerts: () => {
        const state = get();
        let filtered = [...state.alerts];
        
        if (state.severityFilter !== 'ALL') {
          filtered = filtered.filter(a => a.severity === state.severityFilter);
        }
        
        if (state.statusFilter !== 'ALL') {
          filtered = filtered.filter(a => a.status === state.statusFilter);
        }
        
        if (state.frameworkFilter !== 'ALL') {
          filtered = filtered.filter(a => a.framework === state.frameworkFilter);
        }
        
        return filtered;
      },
      
      // ============================================================
      // Computed Values
      // ============================================================
      getAlertStats: () => {
        const alerts = get().alerts;
        return {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length,
          open: alerts.filter(a => a.status === 'open').length,
          acknowledged: alerts.filter(a => a.acknowledged).length,
          resolved: alerts.filter(a => a.status === 'resolved').length,
        };
      },
      
      getOpenAlerts: () => {
        return get().alerts.filter(a => a.status !== 'resolved');
      },
      
      getCriticalAlerts: () => {
        return get().alerts.filter(a => 
          (a.severity === 'critical' || a.severity === 'high') && 
          a.status !== 'resolved'
        );
      },
      
      getAlertById: (id) => get().alerts.find(a => a.id === id),
      
      // ============================================================
      // Loading State
      // ============================================================
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'AlertsStore' }
  )
);

export default useAlertsStore;
