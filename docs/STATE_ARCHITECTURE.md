# State Architecture: Current State & Migration Plan

## The problem

`src/ComplianceMVP.jsx` is ~9,400 lines and declares 184 `useState` hooks.
Every one of those, plus every handler function, is packed into a single
`ctx` object passed through `ComplianceProvider` (`src/context/ComplianceContext.jsx`).
Views consume it like this:

```js
const ctx = useCompliance();
const {
  controls, setControls, assets, setAssets, /* ...450 more identifiers... */
} = ctx;
```

Most views destructure **400-450 identifiers**, of which the large majority
are never referenced in that file. This happened because past bug fixes
(missing state → `ReferenceError` crashes) were resolved by copy-pasting a
bigger destructure block into every view rather than by adding only the
specific identifier that view needed. The pattern is now the default:
adding one new piece of state means touching the monolith's `useState`
list, its `ctx` object, and every view that happens to already have a
matching copy-pasted block — which is exactly how the July 2026 sessions
kept reintroducing `ReferenceError`s and duplicate-object-key bugs.

**This is now caught automatically.** `.github/workflows/frontend-build.yml`
runs `npm run build` on every PR touching `src/`; a production build
(esbuild/rollup) fails or warns on undefined references and duplicate
object keys. Two such bugs (94 duplicate ctx keys, plus several
`ReferenceError`s in earlier sessions) would have been caught by this
before ever reaching a running app.

## The target pattern

**Default: state lives where it's used.** Only put something in
`ComplianceContext` if two or more views genuinely need to read or write
the *same* value. Everything else — search boxes, form drafts, modal
open/close flags, a view's own fetched data — is a local `useState` (or a
`useReducer` for a complex form) inside that view's own file.

A view that owns its data fetches it itself:

```js
export default function SomeView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getSomeData().then(setData).finally(() => setLoading(false));
  }, []);

  // ...
}
```

Genuinely cross-cutting concerns — the authenticated user, the active nav
view, the live `controls` array (many views read control status) — stay in
context. Everything else moves out.

### Views that already follow this pattern (no changes needed)

These were built after the pattern was established and can be used as
reference examples: `TCOView.jsx`, `AssistantPanel.jsx`,
`ViolationSourcesView.jsx`, `TrustPortalView.jsx`, `TrustShowcasePage.jsx`,
`IntegrationsView.jsx`, `HomeView.jsx`, `IntakeWizardView.jsx`,
`ClientIntakePortalView.jsx`, `ConsultingPortalView.jsx`,
`DataFlowArchitectureView.jsx`, `WizardShowcasePage.jsx`. Each of these
either doesn't use `useCompliance()` at all, or reads only 1-3 genuinely
shared values from it.

### Views that still need migration, in recommended order

Ordered by estimated risk (lowest first). "Ctx items" is how many
identifiers the file currently destructures from context — most of that
count is dead weight, not real usage.

| # | View | Ctx items | Risk | Notes |
|---|------|-----------|------|-------|
| ~~0~~ | ~~`FrameworkGlossary.jsx`~~ | ~~452 → 0~~ | ~~done~~ | **Completed in this PR** — used only `frameworkGlossarySearch` + a static constant. Reference example for the rest of this table. |
| 1 | `ResponsibilityView.jsx` | 428 | Low | Likely read-mostly (renders `responsibilityMatrix`, `controlsWithResponsibility` — both derived data). Check whether it writes anything; if not, it can take `controls` as a prop from its parent route instead of full context. |
| 2 | `TimelineView.jsx` | 428 | Low | Renders `projectTimeline`, mostly derived/read-only. |
| 3 | `IntegrationMapView.jsx` | 430 | Low-Medium | Has its own `integrationMap*` state cluster (7+ vars) that's almost certainly private to it — move those to local `useState` first, keep only what's genuinely shared. |
| 4 | `CscaView.jsx` | 428 | Medium | Check `loadCSCAData`/`runPatternDetection` usage — these look like fetch-triggers that belong local to this view. |
| 5 | `IamView.jsx` | 427 | Medium | Similar — `loadIAMData`, `loadAccessTrackingData` are fetch-triggers; the IAM tracking state (`userAccessSummary`, `accessByArea`, etc.) is very likely private to this view alone. |
| 6 | `AutomationView.jsx` | 429 | Medium | Automation walkthrough state (`automationChecklistState`, `showAutomationWalkthrough`, etc.) is opened *from* `ControlsView` (Golden Thread panel) — confirm cross-view usage before moving; may need a small shared "open automation for control X" signal in context while the rest of the automation UI state goes local. |
| 7 | `DashboardView.jsx` | 431 | Medium-High | Reads many derived stats (`stats`, `coverage`, `frameworkGrowth`) computed in the monolith from `controls` — good candidate to move those calculations into a `useDashboardStats(controls)` hook the view calls itself, rather than precomputing in the monolith. |
| 8 | `AuditsView.jsx` | 430 | High | Large, many handlers (`handleCreateAudit`, `handleUploadEvidence`, etc.) — these should become local functions that call `api.*` directly instead of being threaded through context. |
| 9 | `ControlsView.jsx` | 452 (largest) | Highest | Do this last. It's the most cross-referenced view (`openControlDetail`/`closeControlDetail`/`goldenThreadData` are called from `AutomationView`, alert remediation flows, etc.). Map every cross-view call site before touching it. |

## How to migrate one view (step by step)

1. **Read the view file** and list every identifier in its `ctx`
   destructure.
2. **Grep each identifier** across `src/` to find every other file that
   reads or writes it:
   ```bash
   grep -rln "identifierName" src/
   ```
3. **Bucket each identifier:**
   - Used only in this file → move to local `useState`/`useMemo` inside
     the view; delete the `useState` line and `ctx` entry in
     `ComplianceMVP.jsx`; delete the dead destructure entry from every
     other view that copy-pasted it without using it (this is usually
     most of them — see the `frameworkGlossarySearch` example, which was
     dead in 9 other view files).
   - Used by 2+ views for the *same* piece of state → leave it in context,
     but leave a one-line comment explaining which views share it and why.
   - A handler function that only calls `api.*` and updates this view's
     own state → move the function itself into the view, calling `api`
     directly.
4. **Run `npm run build`** — this is now enforced in CI
   (`.github/workflows/frontend-build.yml`) and will catch missed
   references or newly-introduced duplicate keys immediately.
5. **Manually click through the affected view(s)** in the running app —
   automated tests don't exist for the frontend yet (see below), so this
   is still the verification step that matters most.
6. **Grep again** after the change to confirm zero stray references to
   anything you removed:
   ```bash
   grep -rn "removedIdentifier" src/
   ```
7. **One view per PR.** Do not batch multiple view migrations into one
   commit — if something breaks, you want a one-file diff to bisect, not
   a nine-file one.

## Why not do it all at once

Multiple sessions in July 2026 attempted large-scale state reorganization
across many files at once (the "add all missing useState vars" and
"deduplicate ctx identifiers" commits) and each one introduced a new class
of `ReferenceError` that took a following session to find and fix. The
monolith is large enough that a human (or agent) cannot hold its full
cross-reference graph in working memory reliably. The incremental,
one-view-at-a-time approach above is slower but each step is independently
verifiable and revertible.

## Complementary work: frontend test coverage

There is currently no frontend test suite (only the 34 backend pytest
tests added in `backend/tests/`). As views are migrated to own their
state, they become much easier to unit test in isolation — e.g.
`FrameworkGlossary.jsx` post-migration is a pure function of a static
constant and one search string, trivially testable with React Testing
Library without needing to mock the entire `ComplianceContext`. Consider
adding a test alongside each view migration rather than as a separate
follow-up effort.
