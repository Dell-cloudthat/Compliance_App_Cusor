import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Audits Store
 * Manages audit engagements, findings, and evidence state
 */
export const useAuditsStore = create(
  devtools(
    (set, get) => ({
      // ============================================================
      // Audits Data
      // ============================================================
      audits: [],
      selectedAudit: null,
      findings: [],
      evidence: [],
      isLoading: false,
      error: null,
      
      // Set audits
      setAudits: (audits) => set({ audits }),
      
      // Add audit
      addAudit: (audit) => set((state) => ({ 
        audits: [...state.audits, audit]
      })),
      
      // Update audit
      updateAudit: (auditId, updates) => set((state) => ({
        audits: state.audits.map(a => 
          a.id === auditId ? { ...a, ...updates } : a
        ),
        selectedAudit: state.selectedAudit?.id === auditId 
          ? { ...state.selectedAudit, ...updates }
          : state.selectedAudit
      })),
      
      // Remove audit
      removeAudit: (auditId) => set((state) => ({
        audits: state.audits.filter(a => a.id !== auditId),
        selectedAudit: state.selectedAudit?.id === auditId ? null : state.selectedAudit
      })),
      
      // Select audit
      selectAudit: (auditId) => {
        const audit = get().audits.find(a => a.id === auditId);
        set({ selectedAudit: audit || null });
      },
      
      clearSelectedAudit: () => set({ selectedAudit: null }),
      
      // ============================================================
      // Findings
      // ============================================================
      setFindings: (findings) => set({ findings }),
      
      addFinding: (finding) => set((state) => ({ 
        findings: [...state.findings, finding]
      })),
      
      updateFinding: (findingId, updates) => set((state) => ({
        findings: state.findings.map(f => 
          f.id === findingId ? { ...f, ...updates } : f
        )
      })),
      
      removeFinding: (findingId) => set((state) => ({
        findings: state.findings.filter(f => f.id !== findingId)
      })),
      
      getFindingsByAudit: (auditId) => {
        return get().findings.filter(f => f.audit_engagement_id === auditId);
      },
      
      // ============================================================
      // Evidence
      // ============================================================
      setEvidence: (evidence) => set({ evidence }),
      
      addEvidence: (evidence) => set((state) => ({ 
        evidence: [...state.evidence, evidence]
      })),
      
      updateEvidence: (evidenceId, updates) => set((state) => ({
        evidence: state.evidence.map(e => 
          e.id === evidenceId ? { ...e, ...updates } : e
        )
      })),
      
      removeEvidence: (evidenceId) => set((state) => ({
        evidence: state.evidence.filter(e => e.id !== evidenceId)
      })),
      
      getEvidenceByAudit: (auditId) => {
        return get().evidence.filter(e => e.audit_engagement_id === auditId);
      },
      
      getEvidenceByControl: (controlId) => {
        return get().evidence.filter(e => e.control_id === controlId);
      },
      
      // ============================================================
      // Computed Values
      // ============================================================
      getAuditStats: () => {
        const audits = get().audits;
        return {
          total: audits.length,
          planned: audits.filter(a => a.status === 'planned').length,
          inProgress: audits.filter(a => a.status === 'in_progress').length,
          completed: audits.filter(a => a.status === 'completed').length,
          upcoming: audits.filter(a => {
            if (!a.start_date) return false;
            return new Date(a.start_date) > new Date();
          }).length,
        };
      },
      
      getAuditById: (id) => get().audits.find(a => a.id === id),
      
      getUpcomingAudits: () => {
        const today = new Date();
        return get().audits
          .filter(a => a.start_date && new Date(a.start_date) > today)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      },
      
      getActiveAudits: () => {
        return get().audits.filter(a => a.status === 'in_progress');
      },
      
      // ============================================================
      // Loading State
      // ============================================================
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'AuditsStore' }
  )
);

export default useAuditsStore;
