// Zustand Stores - Centralized State Management
export { useAppStore } from './useAppStore';
export { useControlsStore } from './useControlsStore';
export { useAlertsStore } from './useAlertsStore';
export { useAuditsStore } from './useAuditsStore';

// Re-export all stores as default
import { useAppStore } from './useAppStore';
import { useControlsStore } from './useControlsStore';
import { useAlertsStore } from './useAlertsStore';
import { useAuditsStore } from './useAuditsStore';

export default {
  useAppStore,
  useControlsStore,
  useAlertsStore,
  useAuditsStore,
};
