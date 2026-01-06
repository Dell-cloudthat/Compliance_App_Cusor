import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Main Application Store
 * Manages global application state like navigation, user, theme, etc.
 */
export const useAppStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ============================================================
        // Navigation State
        // ============================================================
        currentView: 'dashboard',
        previousView: null,
        
        setView: (view) => set((state) => ({ 
          previousView: state.currentView,
          currentView: view 
        })),
        
        goBack: () => set((state) => ({ 
          currentView: state.previousView || 'dashboard',
          previousView: null
        })),
        
        // ============================================================
        // User State
        // ============================================================
        currentUser: null,
        isAuthenticated: false,
        
        setUser: (user) => set({ 
          currentUser: user,
          isAuthenticated: !!user 
        }),
        
        logout: () => set({ 
          currentUser: null, 
          isAuthenticated: false 
        }),
        
        // ============================================================
        // Theme State
        // ============================================================
        isDarkMode: true,
        
        toggleTheme: () => set((state) => ({ 
          isDarkMode: !state.isDarkMode 
        })),
        
        setDarkMode: (isDark) => set({ isDarkMode: isDark }),
        
        // ============================================================
        // UI State
        // ============================================================
        sidebarCollapsed: false,
        notificationsOpen: false,
        
        toggleSidebar: () => set((state) => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        })),
        
        toggleNotifications: () => set((state) => ({ 
          notificationsOpen: !state.notificationsOpen 
        })),
        
        // ============================================================
        // Backend Connection State
        // ============================================================
        backendConnected: false,
        apiError: null,
        isLoading: false,
        
        setBackendConnected: (connected) => set({ backendConnected: connected }),
        setApiError: (error) => set({ apiError: error }),
        setLoading: (loading) => set({ isLoading: loading }),
        
        // ============================================================
        // Selected Items State
        // ============================================================
        selectedFramework: 'ALL',
        selectedAuditId: null,
        selectedControlId: null,
        selectedAlertId: null,
        
        setSelectedFramework: (framework) => set({ selectedFramework: framework }),
        setSelectedAuditId: (id) => set({ selectedAuditId: id }),
        setSelectedControlId: (id) => set({ selectedControlId: id }),
        setSelectedAlertId: (id) => set({ selectedAlertId: id }),
        
        // Clear all selections
        clearSelections: () => set({
          selectedAuditId: null,
          selectedControlId: null,
          selectedAlertId: null
        }),
      }),
      {
        name: 'compliance-app-storage',
        partialize: (state) => ({
          // Only persist these fields to localStorage
          isDarkMode: state.isDarkMode,
          sidebarCollapsed: state.sidebarCollapsed,
          selectedFramework: state.selectedFramework,
        }),
      }
    ),
    { name: 'AppStore' }
  )
);

export default useAppStore;
