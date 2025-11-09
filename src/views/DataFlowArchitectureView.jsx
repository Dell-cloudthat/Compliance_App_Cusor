import React, { useMemo, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, Plus, Link2, Clock, X, Loader2, RotateCcw, Key, Shield } from 'lucide-react';

const nodeTypeColors = {
  source: '#3b82f6',
  system: '#2563eb',
  processor: '#6366f1',
  analytics: '#7c3aed',
  report: '#14b8a6',
  storage: '#f97316',
};

const sensitivityColors = {
  PII: '#ef4444',
  CUI: '#f59e0b',
  Internal: '#6366f1',
  Confidential: '#8b5cf6',
  Public: '#22c55e',
};

const getNodeColor = (node) => {
  const sensitivity = (node.sensitivity || '').trim();
  if (sensitivity && sensitivityColors[sensitivity]) {
    return sensitivityColors[sensitivity];
  }
  const type = (node.node_type || '').trim().toLowerCase();
  return nodeTypeColors[type] || '#0ea5e9';
};

const severityPalette = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#facc15',
  low: '#38bdf8',
};

const resolveNodeId = (value) => {
  if (value == null) return null;
  if (typeof value === 'object') {
    if (value.id != null) return String(value.id);
    return null;
  }
  return String(value);
};

const getLinkId = (link) => {
  if (!link) return '';
  if (link.id != null) return String(link.id);
  const source = resolveNodeId(link.source_node_id ?? link.source);
  const target = resolveNodeId(link.target_node_id ?? link.target);
  return source && target ? `${source}->${target}-${link.flow_type || ''}` : '';
};

const formatDateTime = (value, options) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, options ?? {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(value);
  }
};

const formatDate = (value) => formatDateTime(value, { month: 'short', day: '2-digit', year: 'numeric' });

const DataFlowArchitectureView = ({
  stats,
  canEdit,
  canManage,
  onAddNode,
  onAddEdge,
  filters,
  onFilterChange,
  nodeTypes,
  sensitivities,
  owners,
  error,
  loading,
  graphData,
  graphRef,
  hasZoomedRef,
  nodeMap,
  nodeSignals = {},
  edgeMap,
  selectedItem,
  onSelectItem,
  onDeleteNode,
  onDeleteEdge,
  auditLog,
  onRefresh,
  showNodeModal,
  showEdgeModal,
  nodeForm,
  edgeForm,
  setNodeForm,
  setEdgeForm,
  onSubmitNode,
  onSubmitEdge,
  closeNodeModal,
  closeEdgeModal,
  editingNode,
  editingEdge,
  nodes,
  persistNodePosition,
  onResetLayout = () => {},
  savingLayout = false,
  resettingLayout = false,
  layoutLastSaved = null,
  accessSummary = null,
  onNavigateControl,
  handleFormCheckbox,
}) => {
  const selectedNodeId = selectedItem?.type === 'node' ? selectedItem.data.id : null;
  const selectedEdgeId = selectedItem?.type === 'edge' ? selectedItem.data.id : null;
  const selectedNodeGraphId = selectedNodeId != null ? String(selectedNodeId) : null;
  const selectedEdgeGraphId = selectedEdgeId != null ? String(selectedEdgeId) : null;

  const [hoverNodeId, setHoverNodeId] = useState(null);
  const [hoverEdgeId, setHoverEdgeId] = useState(null);

  const graphLinks = Array.isArray(graphData?.links) ? graphData.links : [];

  const adjacencyMaps = useMemo(() => {
    const outgoing = new Map();
    const incoming = new Map();
    graphLinks.forEach((link) => {
      const sourceId = resolveNodeId(link.source_node_id ?? link.source);
      const targetId = resolveNodeId(link.target_node_id ?? link.target);
      if (!sourceId || !targetId) return;
      const edgeId = getLinkId(link);
      if (!outgoing.has(sourceId)) outgoing.set(sourceId, []);
      outgoing.get(sourceId).push({ edgeId, nodeId: targetId });
      if (!incoming.has(targetId)) incoming.set(targetId, []);
      incoming.get(targetId).push({ edgeId, nodeId: sourceId });
    });
    return { outgoing, incoming };
  }, [graphLinks]);

  const highlightData = useMemo(() => {
    if (hoverEdgeId) {
      const link = graphLinks.find((edge) => getLinkId(edge) === hoverEdgeId);
      if (link) {
        const sourceId = resolveNodeId(link.source_node_id ?? link.source);
        const targetId = resolveNodeId(link.target_node_id ?? link.target);
        const nodesSet = new Set();
        if (sourceId) nodesSet.add(sourceId);
        if (targetId) nodesSet.add(targetId);
        return { nodes: nodesSet, links: new Set([hoverEdgeId]) };
      }
    }

    if (!hoverNodeId) {
      return { nodes: new Set(), links: new Set() };
    }

    const pathLinks = new Set();
    const traverse = (startId, map) => {
      const visited = new Set();
      if (!startId) return visited;
      const queue = [startId];
      const seen = new Set([startId]);
      while (queue.length > 0) {
        const current = queue.shift();
        const edges = map.get(current) || [];
        edges.forEach(({ edgeId, nodeId }) => {
          if (edgeId) pathLinks.add(edgeId);
          if (nodeId && !seen.has(nodeId)) {
            seen.add(nodeId);
            visited.add(nodeId);
            queue.push(nodeId);
          }
        });
      }
      return visited;
    };

    const downstreamNodes = traverse(hoverNodeId, adjacencyMaps.outgoing);
    const upstreamNodes = traverse(hoverNodeId, adjacencyMaps.incoming);
    const allNodes = new Set([hoverNodeId]);
    downstreamNodes.forEach((id) => allNodes.add(id));
    upstreamNodes.forEach((id) => allNodes.add(id));

    return { nodes: allNodes, links: pathLinks };
  }, [hoverNodeId, hoverEdgeId, adjacencyMaps, graphLinks]);

  const highlightNodesSet = highlightData.nodes;
  const highlightLinksSet = highlightData.links;
  const isHighlighting = highlightNodesSet.size > 0 || highlightLinksSet.size > 0;

  const accessPerNode =
    accessSummary && accessSummary.perNode instanceof Map
      ? accessSummary.perNode
      : new Map();
  const totalAccessPerms = accessSummary?.totalPermissions || 0;
  const accessExpiringSoon = accessSummary?.expiringSoon || 0;
  const privilegedAccounts = Array.isArray(accessSummary?.privilegedAccounts)
    ? accessSummary.privilegedAccounts
    : [];
  const privilegedPreview = privilegedAccounts.slice(0, 3);
  const accessReadOnly = Array.isArray(accessSummary?.readOnlyAccounts)
    ? accessSummary.readOnlyAccounts
    : [];
  const readOnlyPreview = accessReadOnly.slice(0, 3);
  const nodesWithAccess = accessPerNode.size;
  const totalNodes = stats?.totalNodes ?? graphData?.nodes?.length ?? 0;

  const selectedNode =
    selectedNodeId != null ? nodeMap.get(selectedNodeId) || selectedItem?.data : null;
  const selectedEdge =
    selectedEdgeId != null ? edgeMap.get(selectedEdgeId) || selectedItem?.data : null;

  const renderSelectedDetail = () => {
    if (!selectedItem) {
      return (
        <div className="bg-card border border-dashed border-[hsl(var(--border))] rounded-lg p-6 text-center text-sm text-muted-foreground">
          Select a node or flow to see details and actions.
        </div>
      );
    }

    if (selectedItem.type === 'node') {
      const node = selectedNode || selectedItem.data;
      const signalKey = node?.id != null ? String(node.id) : '';
      const signal =
        nodeSignals?.[signalKey] || {
          alertCount: 0,
          counts: { critical: 0, high: 0, medium: 0, low: 0 },
          alerts: [],
          hasDrift: false,
          evidenceGap: !(Array.isArray(node.evidence_links) && node.evidence_links.length > 0),
          inactive: (node.integration_status || '').toLowerCase() !== 'active',
        };
      const accessInfo = accessPerNode.get(signalKey);
      const accessPreview = accessInfo?.permissions?.slice(0, 3) || [];
      const totalAccessEntries = accessInfo?.permissions?.length || 0;
      const alerts = Array.isArray(signal.alerts) ? signal.alerts : [];
      return (
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1">Node</div>
              <h3 className="text-lg font-semibold text-foreground">{node.name}</h3>
              <div className="text-xs text-muted-foreground">Type: {node.node_type}</div>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={() => onAddNode(node)}
                  className="px-3 py-1 rounded border border-primary/40 bg-primary/10 text-xs text-primary hover:bg-primary/20"
                >
                  Edit
                </button>
              )}
              {canManage && (
                <button
                  onClick={() => onDeleteNode(node)}
                  className="px-3 py-1 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-500 hover:bg-red-500/20"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
          {node.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{node.description}</p>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground uppercase tracking-wide mb-1">Sensitivity</div>
                <div className="font-semibold text-foreground">{node.sensitivity || 'Not Classified'}</div>
                {signal.hasDrift && (
                  <div className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                    <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    Drift detected
                  </div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wide mb-1">Status</div>
                <div className="font-semibold text-foreground capitalize">
                  {node.integration_status || 'active'}
                </div>
                {signal.alertCount > 0 && (
                  <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                    {signal.alertCount} active alert{signal.alertCount > 1 ? 's' : ''}
                  </div>
                )}
                {signal.inactive && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Integration marked as {node.integration_status || 'inactive'}
                  </div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wide mb-1">Owner</div>
                <div className="font-semibold text-foreground">{node.owner || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wide mb-1">Responsible</div>
                <div className="font-semibold text-foreground">{node.responsible_party || 'Unassigned'}</div>
              </div>
            </div>
            {Array.isArray(node.data_domains) && node.data_domains.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                  Data Domains
                </div>
                <div className="flex flex-wrap gap-2">
                  {node.data_domains.map((domain, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-xs border border-primary/20"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(node.framework_controls) && node.framework_controls.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                  Linked Controls
                </div>
                <div className="flex flex-wrap gap-2">
                  {node.framework_controls.slice(0, 8).map((control, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onNavigateControl?.(control, 'controls')}
                        className="px-2 py-1 bg-muted text-xs rounded border border-[hsl(var(--border))] text-foreground hover:bg-muted/70 transition-colors"
                      >
                        {control}
                      </button>
                      {onNavigateControl && (
                        <button
                          type="button"
                          onClick={() => onNavigateControl(control, 'responsibility')}
                          className="px-1.5 py-0.5 text-[10px] border border-primary/30 text-primary bg-primary/5 rounded hover:bg-primary/10 transition-colors"
                          title="Open in Responsibility Matrix"
                        >
                          Matrix
                        </button>
                      )}
                    </div>
                  ))}
                  {node.framework_controls.length > 8 && (
                    <span className="text-xs text-muted-foreground">
                      +{node.framework_controls.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
            {Array.isArray(node.evidence_links) && node.evidence_links.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                  Evidence Links
                </div>
                <ul className="space-y-1 text-xs text-primary">
                  {node.evidence_links.map((link, idx) => (
                    <li key={idx} className="truncate">
                      <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(node.created_at || node.updated_at || node.last_sync_at || node.last_adjusted_by) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                {node.created_at && (
                  <div>
                    <div className="uppercase tracking-wide text-[11px]">Added</div>
                    <div className="text-foreground font-medium">{formatDate(node.created_at)}</div>
                  </div>
                )}
                {node.updated_at && (
                  <div>
                    <div className="uppercase tracking-wide text-[11px]">Last Updated</div>
                    <div className="text-foreground font-medium">{formatDateTime(node.updated_at)}</div>
                  </div>
                )}
                {node.last_sync_at && (
                  <div>
                    <div className="uppercase tracking-wide text-[11px]">Last Sync</div>
                    <div className="text-foreground font-medium">{formatDateTime(node.last_sync_at)}</div>
                  </div>
                )}
                {node.last_adjusted_by && (
                  <div>
                    <div className="uppercase tracking-wide text-[11px]">Last Adjusted By</div>
                    <div className="text-foreground font-medium">{node.last_adjusted_by}</div>
                  </div>
                )}
              </div>
            )}
            {accessInfo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Access Control</div>
                  <div className="text-[11px] text-muted-foreground">
                    {accessInfo.total} rule{accessInfo.total === 1 ? '' : 's'} · {accessInfo.elevated} elevated
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {accessInfo.expiringSoon > 0 && (
                    <span className="px-2 py-1 rounded-full border border-amber-400/40 text-amber-500 bg-amber-500/10">
                      {accessInfo.expiringSoon} expiring soon
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-full border border-sky-400/40 text-sky-500 bg-sky-500/10">
                    {accessInfo.viewers.length} people
                  </span>
                </div>
                <div className="space-y-2">
                  {accessPreview.length === 0 ? (
                    <div className="text-xs text-muted-foreground border border-dashed border-[hsl(var(--border))] rounded p-2">
                      No explicit access rules for this system yet.
                    </div>
                  ) : (
                    accessPreview.map((perm) => (
                      <div
                        key={perm.id || `${perm.user}-${perm.type}`}
                        className="border border-[hsl(var(--border))] rounded-lg px-3 py-2 bg-muted/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{perm.user}</span>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                              ['write', 'manage', 'admin'].includes((perm.type || '').toLowerCase())
                                ? 'text-sky-400'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {perm.type || 'read'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                          <span>{perm.grantedBy}</span>
                          <span>
                            {perm.expiresAt ? new Date(perm.expiresAt).toLocaleDateString() : 'No expiry'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  {totalAccessEntries > accessPreview.length && (
                    <div className="text-[10px] text-muted-foreground">
                      +{totalAccessEntries - accessPreview.length} additional access rule
                      {totalAccessEntries - accessPreview.length === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
                {accessInfo.viewers.length > 0 && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                      People with access
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {accessInfo.viewers.slice(0, 6).map((viewer) => (
                        <span
                          key={viewer}
                          className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20"
                        >
                          {viewer}
                        </span>
                      ))}
                      {accessInfo.viewers.length > 6 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{accessInfo.viewers.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {Array.isArray(node.change_log) && node.change_log.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                  Change Log
                </div>
                <div className="space-y-2 text-xs">
                  {node.change_log.slice(0, 4).map((entry, idx) => (
                    <div
                      key={idx}
                      className="border border-dashed border-[hsl(var(--border))] rounded px-3 py-2 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {entry.summary || 'Configuration update'}
                        </span>
                        <span>{formatDateTime(entry.timestamp)}</span>
                      </div>
                      {entry.actor && (
                        <div className="text-muted-foreground mt-0.5">
                          by {entry.actor}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {alerts.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                  Active Alerts
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(signal.counts || {}).map(([key, value]) => {
                    if (!value) return null;
                    const color = severityPalette[key] || severityPalette.low;
                    return (
                      <span
                        key={key}
                        className="px-2 py-1 rounded-full border text-[10px] font-medium"
                        style={{ borderColor: `${color}55`, color }}
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)} {value}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 space-y-2">
                  {alerts.slice(0, 4).map((alert) => {
                    const severity = (alert.severity || 'medium').toLowerCase();
                    const title = alert.title || alert.name || 'Compliance Alert';
                    const description =
                      alert.summary ||
                      alert.description ||
                      alert.message ||
                      'Review remediation guidance to restore coverage.';
                    return (
                      <div
                        key={alert.id}
                        className="border border-[hsl(var(--border))] rounded-lg px-3 py-2 bg-muted/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{title}</span>
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide"
                            style={{ color: severityPalette[severity] || severityPalette.low }}
                          >
                            {severity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {description}
                        </p>
                      </div>
                    );
                  })}
                  {alerts.length > 4 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{alerts.length - 4} more alerts linked to this system
                    </div>
                  )}
                </div>
              </div>
            )}
            {auditLog.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                  Recent Changes
                </div>
                <div className="space-y-2">
                  {auditLog
                    .filter((entry) => entry.target_type === 'node' && entry.target_id === node.id)
                    .slice(0, 3)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="text-xs text-muted-foreground border border-dashed border-[hsl(var(--border))] rounded p-2"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-foreground">
                            {entry.action.replace('_', ' ')}
                          </span>
                          <span>{new Date(entry.created_at).toLocaleString()}</span>
                        </div>
                        {entry.performed_by && <div>by user #{entry.performed_by}</div>}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    const edge = selectedEdge || selectedItem.data;
    return (
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">Flow</div>
            <h3 className="text-lg font-semibold text-foreground">
              {edge.source_node_id} → {edge.target_node_id}
            </h3>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{edge.flow_type}</div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => onAddEdge(edge)}
                className="px-3 py-1 rounded border border-primary/40 bg-primary/10 text-xs text-primary hover:bg-primary/20"
              >
                Edit
              </button>
            )}
            {canManage && (
              <button
                onClick={() => onDeleteEdge(edge)}
                className="px-3 py-1 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-500 hover:bg-red-500/20"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground uppercase tracking-wide mb-1">Transport</div>
            <div className="font-semibold text-foreground">{edge.transport || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wide mb-1">Encryption</div>
            <div className="font-semibold text-foreground">{edge.encryption_status || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wide mb-1">Status</div>
            <div className="font-semibold text-foreground capitalize">{edge.status || 'active'}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wide mb-1">Automated</div>
            <div className="font-semibold text-foreground">{edge.automated === false ? 'Manual' : 'Automated'}</div>
          </div>
        </div>
        {(edge.first_seen_at || edge.last_transfer_at || edge.last_validated_at || edge.daily_volume_gb != null || edge.latency_ms != null) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
            {edge.first_seen_at && (
              <div>
                <div className="uppercase tracking-wide text-[11px]">First Seen</div>
                <div className="text-foreground font-medium">{formatDate(edge.first_seen_at)}</div>
              </div>
            )}
            {edge.last_transfer_at && (
              <div>
                <div className="uppercase tracking-wide text-[11px]">Last Transfer</div>
                <div className="text-foreground font-medium">{formatDateTime(edge.last_transfer_at)}</div>
              </div>
            )}
            {edge.last_validated_at && (
              <div>
                <div className="uppercase tracking-wide text-[11px]">Last Validated</div>
                <div className="text-foreground font-medium">{formatDateTime(edge.last_validated_at)}</div>
              </div>
            )}
            {edge.daily_volume_gb != null && (
              <div>
                <div className="uppercase tracking-wide text-[11px]">Daily Volume</div>
                <div className="text-foreground font-medium">{edge.daily_volume_gb} GB</div>
              </div>
            )}
            {edge.peak_volume_gb != null && (
              <div>
                <div className="uppercase tracking-wide text-[11px]">Peak Volume</div>
                <div className="text-foreground font-medium">{edge.peak_volume_gb} GB</div>
              </div>
            )}
            {edge.latency_ms != null && (
              <div>
                <div className="uppercase tracking-wide text-[11px]">Avg Latency</div>
                <div className="text-foreground font-medium">{Math.round(edge.latency_ms)} ms</div>
              </div>
            )}
          </div>
        )}
        {Array.isArray(edge.controls_impacted) && edge.controls_impacted.length > 0 && (
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">Controls Impacted</div>
            <div className="flex flex-wrap gap-2">
              {edge.controls_impacted.map((control, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onNavigateControl?.(control, 'controls')}
                    className="px-2 py-1 bg-muted text-xs rounded border border-[hsl(var(--border))] text-foreground hover:bg-muted/70 transition-colors"
                  >
                    {control}
                  </button>
                  {onNavigateControl && (
                    <button
                      type="button"
                      onClick={() => onNavigateControl(control, 'responsibility')}
                      className="px-1.5 py-0.5 text-[10px] border border-primary/30 text-primary bg-primary/5 rounded hover:bg-primary/10 transition-colors"
                      title="Open in Responsibility Matrix"
                    >
                      Matrix
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(edge.sample_payloads) && edge.sample_payloads.length > 0 && (
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">Recent Payloads</div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {edge.sample_payloads.slice(0, 4).map((payload, idx) => (
                <li key={idx} className="border border-dashed border-[hsl(var(--border))] rounded px-2 py-1 bg-muted/20">
                  {payload}
                </li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(edge.change_log) && edge.change_log.length > 0 && (
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">Flow Change Log</div>
            <div className="space-y-2 text-xs">
              {edge.change_log.slice(0, 4).map((entry, idx) => (
                <div
                  key={idx}
                  className="border border-dashed border-[hsl(var(--border))] rounded px-3 py-2 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {entry.summary || 'Update'}
                    </span>
                    <span>{formatDateTime(entry.timestamp)}</span>
                  </div>
                  {entry.actor && (
                    <div className="text-muted-foreground mt-0.5">
                      by {entry.actor}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const formattedLastSaved =
    layoutLastSaved != null
      ? new Date(layoutLastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

  const getLinkColor = (link) => {
    const linkId = getLinkId(link);
    if (selectedEdgeGraphId === linkId) {
      return '#6366f1';
    }
    if (highlightLinksSet.has(linkId)) {
      return '#38bdf8';
    }
    const status = (link.status || '').toLowerCase();
    let baseColor = '#94a3b8';
    if (status === 'planned') baseColor = '#fbbf24';
    else if (status === 'decommissioning') baseColor = '#f97316';
    if (isHighlighting) {
      return `${baseColor}55`;
    }
    return baseColor;
  };

  const getLinkWidth = (link) => {
    const linkId = getLinkId(link);
    if (selectedEdgeGraphId === linkId) return 3.2;
    if (highlightLinksSet.has(linkId)) return 2.4;
    return isHighlighting ? 1 : 1.5;
  };
  const getLinkParticles = (link) => {
    const baseCountRaw =
      link?.particle_count ??
      (link?.daily_volume_gb != null ? Math.round(Math.max(1, link.daily_volume_gb / 0.3)) : 1);
    const baseCount = Math.max(1, Math.min(4, baseCountRaw));
    const linkId = getLinkId(link);
    if (highlightLinksSet.has(linkId) || selectedEdgeGraphId === linkId) {
      return Math.max(baseCount, 2);
    }
    if (isHighlighting) {
      return 0;
    }
    return (link?.status || '').toLowerCase() === 'planned' ? 0 : baseCount;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Data Flow Architecture</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize where compliance data originates, how it moves, and who can change it.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
          {(savingLayout || resettingLayout) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {resettingLayout ? 'Resetting layout…' : 'Saving layout…'}
            </div>
          )}
          {!savingLayout && !resettingLayout && formattedLastSaved && (
            <div className="text-xs text-muted-foreground">
              Layout saved at {formattedLastSaved}
            </div>
          )}
          {canEdit && (
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => onAddNode(null)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Source/System
              </button>
              <button
                onClick={() => onAddEdge(null)}
                className="flex items-center gap-2 px-4 py-2 border border-primary/40 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
              >
                <Link2 className="w-4 h-4" />
                Add Flow
              </button>
              <button
                onClick={onResetLayout}
                disabled={savingLayout || resettingLayout}
                className="flex items-center gap-2 px-4 py-2 border border-muted-foreground/40 bg-muted/30 text-foreground rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Layout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
          <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">Total Systems</div>
          <div className="text-2xl font-bold text-foreground">{stats.totalNodes}</div>
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
          <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">Active Flows</div>
          <div className="text-2xl font-bold text-primary">{stats.totalEdges}</div>
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
          <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">High-Sensitivity Nodes</div>
          <div className="text-2xl font-bold text-red-500">{stats.highSensitivity}</div>
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
          <div className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">Automated Flows</div>
          <div className="text-2xl font-bold text-emerald-500">{stats.automatedFlows}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-xs uppercase text-muted-foreground mb-1 tracking-wide">
            <span>Access Rules</span>
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalAccessPerms}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {nodesWithAccess} of {totalNodes || '—'} systems governed
          </div>
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-xs uppercase text-muted-foreground mb-1 tracking-wide">
            <span>Privileged Accounts</span>
            <Shield className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-500">{privilegedAccounts.length}</div>
          {privilegedPreview.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {privilegedPreview.map((account) => (
                <span key={account} className="px-2 py-1 bg-sky-500/10 text-sky-500 text-[11px] rounded-full border border-sky-500/20">
                  {account}
                </span>
              ))}
              {privilegedAccounts.length > privilegedPreview.length && (
                <span className="text-[10px] text-muted-foreground">
                  +{privilegedAccounts.length - privilegedPreview.length} more
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">No elevated access granted.</div>
          )}
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-xs uppercase text-muted-foreground mb-1 tracking-wide">
            <span>Access Expiring (30d)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-bold ${accessExpiringSoon > 0 ? 'text-amber-500' : 'text-foreground'}`}>
            {accessExpiringSoon}
          </div>
          {readOnlyPreview.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {readOnlyPreview.map((account) => (
                <span key={account} className="px-2 py-1 bg-muted text-[11px] rounded-full border border-[hsl(var(--border))]">
                  {account}
                </span>
              ))}
              {accessReadOnly.length > readOnlyPreview.length && (
                <span className="text-[10px] text-muted-foreground">
                  +{accessReadOnly.length - readOnlyPreview.length} more viewers
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">
              {accessExpiringSoon > 0 ? 'Review upcoming expirations.' : 'No access reviews pending.'}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 md:p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs uppercase text-muted-foreground tracking-wide block mb-2">
              Filter by Type
            </label>
            <select
              value={filters.nodeType}
              onChange={(e) => onFilterChange('nodeType', e.target.value)}
              className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground text-sm"
            >
              <option value="ALL">All Types</option>
              {nodeTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase text-muted-foreground tracking-wide block mb-2">
              Sensitivity
            </label>
            <select
              value={filters.sensitivity}
              onChange={(e) => onFilterChange('sensitivity', e.target.value)}
              className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground text-sm"
            >
              <option value="ALL">All Sensitivities</option>
              {sensitivities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase text-muted-foreground tracking-wide block mb-2">
              Owner
            </label>
            <select
              value={filters.owner}
              onChange={(e) => onFilterChange('owner', e.target.value)}
              className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground text-sm"
            >
              <option value="ALL">All Owners</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground tracking-wide block mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground text-sm"
            >
              <option value="ALL">All</option>
              <option value="active">Active</option>
              <option value="planned">Planned</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground tracking-wide block mb-2">
              Search
            </label>
            <input
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground text-sm"
              placeholder="Search systems or controls…"
            />
          </div>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-xs text-red-500 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="bg-muted/40 rounded-lg border border-[hsl(var(--border))] overflow-hidden">
          <div className="relative h-[420px] md:h-[460px]">
            {graphData.nodes.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <Network className="w-10 h-10 text-muted-foreground" />
                <span>No systems found. Add your first source or system to begin mapping data flows.</span>
              </div>
            ) : (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                enableNodeDrag={canEdit}
                cooldownTicks={80}
                backgroundColor="#0b1120"
                linkDirectionalArrowLength={8}
                linkDirectionalArrowRelPos={1}
                linkDirectionalParticles={getLinkParticles}
                linkDirectionalParticleSpeed={(link) => {
                  const linkId = getLinkId(link);
                  const baseSpeed =
                    link?.latency_ms != null
                      ? Math.min(0.02, Math.max(0.002, 12 / Math.max(link.latency_ms, 120)))
                      : 0.004;
                  if (highlightLinksSet.has(linkId) || selectedEdgeGraphId === linkId) {
                    return baseSpeed * 1.6;
                  }
                  if (isHighlighting && !highlightLinksSet.has(linkId)) {
                    return 0.0001;
                  }
                  if ((link?.status || '').toLowerCase() === 'planned') {
                    return 0.0001;
                  }
                  return baseSpeed;
                }}
                linkDirectionalParticleWidth={(link) =>
                  highlightLinksSet.has(getLinkId(link)) || selectedEdgeGraphId === getLinkId(link) ? 2 : 1
                }
                linkColor={getLinkColor}
                linkWidth={getLinkWidth}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const nodeKey = node?.id != null ? String(node.id) : '';
                  const isHovered = hoverNodeId === nodeKey;
                  const isSelected = selectedNodeGraphId === nodeKey;
                  const isPathHighlighted = highlightNodesSet.has(nodeKey);
                  const shouldDim = isHighlighting && !isPathHighlighted && !isHovered;
                  const radius = isSelected ? 11 : 9;
                  const color = getNodeColor(node);
                  const signal = nodeSignals?.[nodeKey] || {};

                  ctx.save();
                  if (shouldDim) {
                    ctx.globalAlpha = 0.28;
                  }
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = color;
                  ctx.shadowBlur = isHovered ? 20 : isPathHighlighted ? 14 : 8;
                  ctx.shadowColor = color;
                  ctx.fill();
                  let strokeColor = '#0f172a';
                  let strokeWidth = 1.6;
                  if (signal.alertCount > 0) {
                    strokeColor = '#ef4444';
                    strokeWidth = 2.8;
                  } else if (signal.hasDrift) {
                    strokeColor = '#f59e0b';
                    strokeWidth = 2.4;
                  } else if (isSelected) {
                    strokeColor = '#22c55e';
                    strokeWidth = 2.4;
                  } else if (signal.inactive) {
                    strokeColor = '#94a3b8';
                    strokeWidth = 1.4;
                  } else if ((signal.access?.elevated || 0) > 0) {
                    strokeColor = '#0ea5e9';
                    strokeWidth = 2.2;
                  }
                  if (isPathHighlighted && strokeColor === '#0f172a') {
                    strokeColor = '#38bdf8';
                    strokeWidth = 2.2;
                  } else if (isPathHighlighted) {
                    strokeWidth = Math.max(strokeWidth, 2.4);
                  }
                  ctx.lineWidth = strokeWidth;
                  ctx.strokeStyle = strokeColor;
                  ctx.stroke();
                  ctx.restore();

                  ctx.save();
                  if (shouldDim) {
                    ctx.globalAlpha = 0.45;
                  }
                  const fontSize = Math.max(6, 12 / globalScale);
                  ctx.font = `${fontSize}px Inter, sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  ctx.fillStyle = '#e2e8f0';
                  const label = node.name || `Node ${node.id}`;
                  ctx.fillText(label, node.x, node.y + radius + 2 / globalScale);
                  if (signal.evidenceGap) {
                    ctx.beginPath();
                    ctx.setLineDash([3, 3]);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#bfdbfe';
                    ctx.arc(node.x, node.y, radius + 4 / globalScale, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.setLineDash([]);
                  }
                  const alertCount = signal.alertCount || 0;
                  if (alertCount > 0) {
                    const counts = signal.counts || {};
                    const badgeColor =
                      (counts.critical || 0) > 0
                        ? severityPalette.critical
                        : (counts.high || 0) > 0
                        ? severityPalette.high
                        : (counts.medium || 0) > 0
                        ? severityPalette.medium
                        : severityPalette.low;
                    const badgeRadius = Math.max(5, 8 / globalScale);
                    const badgeX = node.x + radius * 0.82;
                    const badgeY = node.y - radius * 0.82;
                    ctx.beginPath();
                    ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
                    ctx.fillStyle = badgeColor;
                    ctx.fill();
                    ctx.font = `${Math.max(5, 11 / globalScale)}px Inter, sans-serif`;
                    ctx.fillStyle = '#0b1120';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(alertCount.toString(), badgeX, badgeY + 0.5);
                  }
                  ctx.restore();
                }}
                nodePointerAreaPaint={(node, color, ctx) => {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
                  ctx.fill();
                }}
                onNodeHover={(node) => {
                  if (node) {
                    setHoverNodeId(String(node.id));
                    setHoverEdgeId(null);
                  } else {
                    setHoverNodeId(null);
                  }
                }}
                onLinkHover={(link) => {
                  if (link) {
                    setHoverEdgeId(getLinkId(link));
                    setHoverNodeId(null);
                  } else {
                    setHoverEdgeId(null);
                  }
                }}
                onNodeClick={(node) => {
                  const original = nodeMap.get(node.id) || node;
                  onSelectItem({ type: 'node', data: original });
                }}
                onLinkClick={(link) => {
                  const original = edgeMap.get(link.id) || link;
                  onSelectItem({ type: 'edge', data: original });
                }}
                onNodeDragEnd={(node) => {
                  node.fx = node.x;
                  node.fy = node.y;
                  persistNodePosition(node);
                }}
                onBackgroundClick={() => {
                  onSelectItem(null);
                  setHoverNodeId(null);
                  setHoverEdgeId(null);
                }}
                onEngineStop={() => {
                  if (!hasZoomedRef.current && graphRef.current) {
                    graphRef.current.zoomToFit(400, 80);
                    hasZoomedRef.current = true;
                  }
                }}
              />
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-10">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  Loading architecture…
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-4">
          <div className="bg-muted/20 border border-[hsl(var(--border))] rounded-lg p-4 text-xs text-muted-foreground flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              <span>Active alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span>Drift detected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
              <span>Elevated access</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full border border-blue-300 border-dashed" />
              <span>Evidence gap</span>
            </div>
            <div className="basis-full text-[11px] text-muted-foreground/80 pt-1">
              Tip: click a control tag to jump directly into Controls or the Responsibility Matrix.
            </div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Change Activity</h3>
                <p className="text-xs text-muted-foreground">Most recent architecture updates</p>
              </div>
              <button
                onClick={onRefresh}
                className="text-xs px-3 py-1 rounded border border-[hsl(var(--border))] hover:bg-muted transition-colors"
              >
                Refresh
              </button>
            </div>
            {auditLog.length === 0 ? (
              <div className="text-xs text-muted-foreground">No recent updates recorded.</div>
            ) : (
              <div className="space-y-3">
                {auditLog.slice(0, 6).map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-dashed border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs text-muted-foreground"
                  >
                    <div className="flex justify-бetween">
                      <span className="font-medium text-foreground">{entry.action.replace('_', ' ')}</span>
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase tracking-wide">{entry.target_type} #{entry.target_id}</span>
                      {entry.performed_by && <span>user {entry.performed_by}</span>}
                    </div>
                    {entry.reason && <div className="italic mt-1">{entry.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>{renderSelectedDetail()}</div>
      </div>

      {(showNodeModal || showEdgeModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { closeNodeModal(); closeEdgeModal(); }} />
          <div className="relative bg-card border border-[hsl(var(--border))] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {showNodeModal ? (
              <form onSubmit={onSubmitNode} className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {editingNode ? 'Edit Data Source/System' : 'Add Data Source/System'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Describe where data originates, how sensitive it is, and who is responsible.
                    </p>
                  </div>
                  <button type="button" onClick={closeNodeModal} className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Type</label>
                    <select
                      value={nodeForm.node_type}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, node_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      required
                    >
                      <option value="source">Data Source</option>
                      <option value="system">Internal System</option>
                      <option value="processor">Processor / ETL</option>
                      <option value="analytics">Analytics</option>
                      <option value="report">Report / Dashboard</option>
                      <option value="storage">Storage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Name</label>
                    <input
                      value={nodeForm.name}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="e.g., Snowflake Data Warehouse"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Description</label>
                    <textarea
                      value={nodeForm.description}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      rows={3}
                      placeholder="Describe the purpose of this system and the data it processes."
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Sensitivity</label>
                    <input
                      value={nodeForm.sensitivity}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, sensitivity: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="e.g., PII, Internal, Public"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Integration Status</label>
                    <select
                      value={nodeForm.integration_status}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, integration_status: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                    >
                      <option value="active">Active</option>
                      <option value="planned">Planned</option>
                      <option value="deprecated">Deprecated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Owner</label>
                    <input
                      value={nodeForm.owner}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, owner: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="Team or person accountable"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Responsible Party</label>
                    <input
                      value={nodeForm.responsible_party}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, responsible_party: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="Operational owner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Data Domains</label>
                    <input
                      value={nodeForm.data_domains}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, data_domains: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="Comma separated (e.g., Audit Logs, Metrics)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Classification Tags</label>
                    <input
                      value={nodeForm.classification_tags}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, classification_tags: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="Comma separated tags"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Framework Controls</label>
                    <input
                      value={nodeForm.framework_controls}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, framework_controls: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="Comma separated control IDs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Evidence Links</label>
                    <input
                      value={nodeForm.evidence_links}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, evidence_links: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="Comma separated URLs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Last Sync</label>
                    <input
                      type="datetime-local"
                      value={nodeForm.last_sync_at}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, last_sync_at: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Sync Frequency</label>
                    <input
                      value={nodeForm.sync_frequency}
                      onChange={(e) => setNodeForm((prev) => ({ ...prev, sync_frequency: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="e.g., Real-time, Hourly"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={nodeForm.system_of_record}
                      onChange={(e) => handleFormCheckbox('node', e.target.checked)}
                    />
                    System of record
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={closeNodeModal}
                    className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                  >
                    {editingNode ? 'Update Node' : 'Create Node'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={onSubmitEdge} className="p-6 space-y-4 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {editingEdge ? 'Edit Data Flow' : 'Add Data Flow'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Connect systems to represent how data moves across your compliance architecture.
                    </p>
                  </div>
                  <button type="button" onClick={closeEdgeModal} className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Source System</label>
                    <select
                      value={edgeForm.source_node_id}
                      onChange={(e) => setEdgeForm((prev) => ({ ...prev, source_node_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      required
                    >
                      <option value="">Select source</option>
                      {nodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Target System</label>
                    <select
                      value={edgeForm.target_node_id}
                      onChange={(e) => setEdgeForm((prev) => ({ ...prev, target_node_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      required
                    >
                      <option value="">Select destination</option>
                      {nodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Flow Type</label>
                    <select
                      value={edgeForm.flow_type}
                      onChange={(e) => setEdgeForm((prev) => ({ ...prev, flow_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      required
                    >
                      <option value="ingest">Ingest</option>
                      <option value="transform">Transform</option>
                      <option value="export">Export</option>
                      <option value="evidence">Evidence</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Transport</label>
                    <input
                      value={edgeForm.transport}
                      onChange={(e) => setEdgeForm((prev) => ({ ...prev, transport: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="e.g., API, SFTP"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Encryption Status</label>
                    <input
                      value={edgeForm.encryption_status}
                      onChange={(e) => setEdgeForm((prev) => ({ ...prev, encryption_status: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="e.g., Encrypted in transit"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Status</label>
                    <select
                      value={edgeForm.status}
                      onChange={(e) => setEdgeForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                    >
                      <option value="active">Active</option>
                      <option value="planned">Planned</option>
                      <option value="decommissioning">Decommissioning</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-muted-foreground mb-2">Controls Impacted</label>
                    <input
                      value={edgeForm.controls_impacted}
                      onChange={(e) => setEdgeForm((prev) => ({ ...prev, controls_impacted: e.target.value }))}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                      placeholder="Comma separated control IDs"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={edgeForm.automated}
                      onChange={(e) => handleFormCheckbox('edge', e.target.checked)}
                    />
                    <span>Automated integration</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={closeEdgeModal}
                    className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                  >
                    {editingEdge ? 'Update Flow' : 'Create Flow'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFlowArchitectureView;
