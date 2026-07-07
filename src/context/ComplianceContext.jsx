/**
 * ComplianceContext
 *
 * A thin React context that bridges ComplianceMVP (state owner) and all
 * extracted view components.  ComplianceMVP wraps its JSX in
 * <ComplianceProvider value={ctx}> and each view calls useCompliance()
 * to access whatever slice of state it needs.
 */

import { createContext, useContext } from 'react';

const ComplianceContext = createContext(null);

/**
 * Provider — used once in ComplianceMVP.jsx around the view router.
 * `value` should be the full `ctx` object built in ComplianceMVP.
 */
export function ComplianceProvider({ value, children }) {
  return (
    <ComplianceContext.Provider value={value}>
      {children}
    </ComplianceContext.Provider>
  );
}

/**
 * Hook used by every extracted view component.
 *
 * @returns {object} The ctx object provided by ComplianceMVP.
 */
export function useCompliance() {
  const ctx = useContext(ComplianceContext);
  if (!ctx) {
    throw new Error('useCompliance must be used inside a ComplianceProvider');
  }
  return ctx;
}
