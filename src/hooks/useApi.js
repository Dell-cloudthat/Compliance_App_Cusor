import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ============================================================================
// Query Keys
// ============================================================================
export const queryKeys = {
  // Controls
  controls: ['controls'],
  control: (id) => ['controls', id],
  
  // Audits
  audits: ['audits'],
  audit: (id) => ['audits', id],
  auditFindings: (id) => ['audits', id, 'findings'],
  auditEvidence: (id) => ['audits', id, 'evidence'],
  
  // Alerts
  alerts: ['alerts'],
  alert: (id) => ['alerts', id],
  
  // Security Events
  securityEvents: ['security-events'],
  securityEvent: (id) => ['security-events', id],
  
  // Users
  users: ['users'],
  user: (id) => ['users', id],
  currentUser: ['current-user'],
  
  // Data Sources
  dataSources: ['data-sources'],
  dataSource: (id) => ['data-sources', id],
  
  // Workflows
  workflows: ['workflows'],
  workflow: (id) => ['workflows', id],
  
  // Integration Events
  integrationEvents: ['integration-events'],
  
  // Reports
  reports: ['reports'],
  auditReport: (auditId) => ['reports', 'audit', auditId],
};

// ============================================================================
// Controls Hooks
// ============================================================================

export function useControls(userId, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.controls, userId],
    queryFn: () => api.getControls(userId),
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    ...options,
  });
}

export function useControl(controlId, options = {}) {
  return useQuery({
    queryKey: queryKeys.control(controlId),
    queryFn: () => api.getControl(controlId),
    enabled: !!controlId,
    ...options,
  });
}

export function useUpdateControl() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, controlId, updates }) => 
      api.updateControl(userId, controlId, updates),
    onSuccess: (data, { userId }) => {
      // Invalidate controls list
      queryClient.invalidateQueries({ queryKey: [...queryKeys.controls, userId] });
    },
  });
}

export function useBulkUpdateControls() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, controlIds, updates }) => 
      api.bulkUpdateControls(userId, controlIds, updates),
    onSuccess: (data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.controls, userId] });
    },
  });
}

// ============================================================================
// Audits Hooks
// ============================================================================

export function useAudits(userId, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.audits, userId],
    queryFn: () => api.getAudits(userId),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useAudit(auditId, options = {}) {
  return useQuery({
    queryKey: queryKeys.audit(auditId),
    queryFn: () => api.getAudit(auditId),
    enabled: !!auditId,
    ...options,
  });
}

export function useAuditFindings(auditId, options = {}) {
  return useQuery({
    queryKey: queryKeys.auditFindings(auditId),
    queryFn: () => api.getAuditFindings(auditId),
    enabled: !!auditId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useAuditEvidence(auditId, options = {}) {
  return useQuery({
    queryKey: queryKeys.auditEvidence(auditId),
    queryFn: () => api.getAuditEvidence(auditId),
    enabled: !!auditId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useCreateAudit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (auditData) => api.createAudit(auditData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits });
    },
  });
}

export function useUpdateAudit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ auditId, updates }) => api.updateAudit(auditId, updates),
    onSuccess: (data, { auditId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit(auditId) });
    },
  });
}

// ============================================================================
// Findings Hooks
// ============================================================================

export function useCreateFinding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ auditId, findingData }) => 
      api.createFinding(auditId, findingData),
    onSuccess: (data, { auditId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auditFindings(auditId) });
    },
  });
}

export function useUpdateFinding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ auditId, findingId, updates }) => 
      api.updateFinding(findingId, updates),
    onSuccess: (data, { auditId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auditFindings(auditId) });
    },
  });
}

// ============================================================================
// Alerts Hooks
// ============================================================================

export function useAlerts(userId, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.alerts, userId],
    queryFn: () => api.getComplianceAlerts(userId),
    staleTime: 30 * 1000, // Alerts refresh more frequently - 30 seconds
    refetchInterval: 60 * 1000, // Auto-refetch every minute
    ...options,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, userId }) => 
      api.acknowledgeAlert(alertId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, userId, resolution }) => 
      api.resolveAlert(alertId, userId, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

// ============================================================================
// Security Events Hooks
// ============================================================================

export function useSecurityEvents(userId, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.securityEvents, userId],
    queryFn: () => api.getSecurityEvents(userId),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useCreateSecurityEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventData) => api.createSecurityEvent(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.securityEvents });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

// ============================================================================
// Workflows Hooks
// ============================================================================

export function useWorkflows(userId, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.workflows, userId],
    queryFn: () => api.getWorkflows(userId),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workflowData) => api.createWorkflow(workflowData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows });
    },
  });
}

export function useExecuteWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workflowId, userId }) => 
      api.executeWorkflow(workflowId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows });
    },
  });
}

// ============================================================================
// User Hooks
// ============================================================================

export function useCurrentUser(options = {}) {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => api.getCurrentUser(),
    staleTime: 10 * 60 * 1000, // User data rarely changes
    ...options,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData) => api.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

// ============================================================================
// Reports Hooks
// ============================================================================

export function useAuditReport(auditId, reportType = 'full', options = {}) {
  return useQuery({
    queryKey: [...queryKeys.auditReport(auditId), reportType],
    queryFn: () => {
      switch (reportType) {
        case 'full':
          return api.getFullAuditReport(auditId);
        case 'evidence':
          return api.getEvidencePackage(auditId);
        case 'executive':
          return api.getExecutiveSummary(auditId);
        default:
          return api.getFullAuditReport(auditId);
      }
    },
    enabled: !!auditId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ============================================================================
// Prefetch Helpers
// ============================================================================

export function usePrefetchAudit(queryClient) {
  return (auditId) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.audit(auditId),
      queryFn: () => api.getAudit(auditId),
      staleTime: 5 * 60 * 1000,
    });
    
    // Also prefetch findings and evidence
    queryClient.prefetchQuery({
      queryKey: queryKeys.auditFindings(auditId),
      queryFn: () => api.getAuditFindings(auditId),
      staleTime: 2 * 60 * 1000,
    });
  };
}

// ============================================================================
// Custom Hook for Optimistic Updates
// ============================================================================

export function useOptimisticUpdate(queryKey) {
  const queryClient = useQueryClient();
  
  return {
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);
      
      // Optimistically update
      queryClient.setQueryData(queryKey, (old) => {
        if (Array.isArray(old)) {
          return [...old, newData];
        }
        return { ...old, ...newData };
      });
      
      return { previousData };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKey, context.previousData);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  };
}
