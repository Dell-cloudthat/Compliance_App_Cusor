/**
 * FrameworkGlossary
 *
 * Fully self-contained: a static reference grid over FRAMEWORK_GLOSSARY
 * with a local search box. Nothing here is shared with any other view, so
 * it owns its own state directly instead of reading it through the shared
 * ComplianceContext.
 *
 * (This file previously destructured ~450 identifiers from context —
 * almost all unused. See docs/STATE_ARCHITECTURE.md for the migration
 * pattern this rewrite follows.)
 */

import React, { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { FRAMEWORK_GLOSSARY } from '../data/constants';

export default function FrameworkGlossary() {
  const [frameworkGlossarySearch, setFrameworkGlossarySearch] = useState('');

  const query = frameworkGlossarySearch.trim().toLowerCase();
  const filteredFrameworks = FRAMEWORK_GLOSSARY.filter((framework) => {
    if (!query) return true;
    return (
      framework.name.toLowerCase().includes(query) ||
      framework.shortName.toLowerCase().includes(query) ||
      framework.description.toLowerCase().includes(query) ||
      framework.focusAreas.some((area) => area.toLowerCase().includes(query)) ||
      framework.idealFor.some((audience) => audience.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Framework Glossary & Control Guide</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Quick explanations, focus areas, and official reference links to help teams understand where each framework shines.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={frameworkGlossarySearch}
              onChange={(e) => setFrameworkGlossarySearch(e.target.value)}
              placeholder="Search frameworks, controls, industries..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredFrameworks.map((framework) => (
          <div key={framework.id} className="border border-[hsl(var(--border))] rounded-lg bg-card shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{framework.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                  {framework.category} • {framework.shortName}
                </p>
              </div>
              <button
                onClick={() => window.open(framework.docLink, '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Reference <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{framework.description}</p>

            <div className="space-y-2">
              <div>
                <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Focus Areas</div>
                <div className="flex flex-wrap gap-1.5">
                  {framework.focusAreas.map((area) => (
                    <span key={`${framework.id}-${area}`} className="text-[11px] bg-muted/50 border border-[hsl(var(--border))] text-muted-foreground px-2 py-0.5 rounded">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Great For</div>
                <div className="flex flex-wrap gap-1.5">
                  {framework.idealFor.map((audience) => (
                    <span key={`${framework.id}-aud-${audience}`} className="text-[11px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded">
                      {audience}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground pt-2 border-t border-dashed border-[hsl(var(--border))]">
              <div>
                <div className="font-semibold text-foreground">{framework.quickFacts.controlFamilies}</div>
                <div className="text-[11px] uppercase tracking-wide">Control Families</div>
              </div>
              <div>
                <div className="font-semibold text-foreground">{framework.quickFacts.totalControls}</div>
                <div className="text-[11px] uppercase tracking-wide">Controls</div>
              </div>
              <div>
                <div className="font-semibold text-foreground">{framework.quickFacts.assuranceLevel}</div>
                <div className="text-[11px] uppercase tracking-wide">Assurance</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFrameworks.length === 0 && (
        <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-8 text-center text-sm text-muted-foreground">
          No framework matches your search. Try keywords like "cloud", "healthcare", or "risk".
        </div>
      )}
    </div>
  );
}
