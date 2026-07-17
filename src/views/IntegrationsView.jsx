/**
 * IntegrationsView — Bring-your-own-credentials tool connection hub
 *
 * Clients paste their own read-only API keys from their security vendors.
 * Credentials are encrypted at rest server-side — never stored in plaintext.
 * No platform-wide vendor partnerships required.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, CheckCircle2, AlertCircle, Clock, Plus, Trash2, RefreshCw,
  Eye, EyeOff, ExternalLink, Shield, Brain, Database, Globe,
  ChevronDown, ChevronUp, Info, Lock, Key, Check, X, Loader2
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';

// ─── Vendor catalogue ─────────────────────────────────────────────────────────

const VENDORS = [
  {
    id: 'okta',
    name: 'Okta',
    category: 'Identity & Access',
    icon: '🔐',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    description: 'Pull user/group/app-access data to populate IAM controls and the AI Assessment wizard.',
    credential_type: 'api_key',
    scopes: 'Read-only: okta.users.read, okta.groups.read, okta.apps.read',
    how_to_obtain: 'Okta Admin Console → Security → API → Tokens → Create Token (select read-only scopes)',
    doc_url: 'https://developer.okta.com/docs/guides/create-an-api-token/',
    placeholder: 'Paste your Okta API token…',
    trust_pillar: 'AI & ML Protection',
  },
  {
    id: 'azure_ad',
    name: 'Microsoft Entra ID',
    category: 'Identity & Access',
    icon: '🪟',
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
    border: 'border-blue-600/20',
    description: 'Pull Azure AD / Entra ID users, groups, and conditional access policies.',
    credential_type: 'api_key',
    scopes: 'Read-only: User.Read.All, Group.Read.All, Policy.Read.All',
    how_to_obtain: 'Azure Portal → App registrations → New registration → Add API permissions (read-only)',
    doc_url: 'https://learn.microsoft.com/en-us/graph/auth-register-app-v2',
    placeholder: 'Paste your Azure AD client secret…',
    trust_pillar: 'AI & ML Protection',
  },
  {
    id: 'crowdstrike',
    name: 'CrowdStrike Falcon',
    category: 'Endpoint Security',
    icon: '🦅',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    description: 'Pull endpoint coverage, detection counts, and agent deployment status for the Security Coverage pillar.',
    credential_type: 'api_key',
    scopes: 'Read-only: Hosts Read, Detections Read, Prevention Policies Read',
    how_to_obtain: 'CrowdStrike Console → Support → API Clients → Add New API Client (select read-only scopes)',
    doc_url: 'https://falcon.crowdstrike.com/documentation/46/crowdstrike-oauth2-based-apis',
    placeholder: 'Paste your CrowdStrike API key…',
    trust_pillar: 'Security Coverage',
  },
  {
    id: 'sentinelone',
    name: 'SentinelOne',
    category: 'Endpoint Security',
    icon: '🛡️',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    description: 'Pull endpoint agent coverage and threat detection data.',
    credential_type: 'api_key',
    scopes: 'Read-only: threats.read, agents.read, groups.read',
    how_to_obtain: 'SentinelOne Console → Settings → Users → Service Users → Add Service User (Viewer role)',
    doc_url: 'https://usea1-partners.sentinelone.net/docs/en/generating-api-tokens.html',
    placeholder: 'Paste your SentinelOne API token…',
    trust_pillar: 'Security Coverage',
  },
  {
    id: 'aws',
    name: 'AWS',
    category: 'Cloud / AI Posture',
    icon: '☁️',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    description: 'Pull AWS Security Hub findings, IAM policy data, and SageMaker/Bedrock AI service inventory.',
    credential_type: 'api_key',
    scopes: 'Read-only: SecurityHub:Get*, IAM:List*, SageMaker:List*',
    how_to_obtain: 'AWS Console → IAM → Users → Create user → Attach SecurityAudit (read-only) policy → Create access key',
    doc_url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
    placeholder: 'Format: ACCESS_KEY_ID:SECRET_ACCESS_KEY',
    trust_pillar: 'AI & ML Protection',
  },
  {
    id: 'google_workspace',
    name: 'Google Workspace',
    category: 'Identity & Access',
    icon: '🔵',
    color: 'text-green-600',
    bg: 'bg-green-600/10',
    border: 'border-green-600/20',
    description: 'Pull Google Workspace users, groups, and admin audit logs.',
    credential_type: 'api_key',
    scopes: 'Read-only: admin.directory.readonly, admin.reports.audit.readonly',
    how_to_obtain: 'Google Admin Console → Security → API Controls → Domain-wide delegation → Add service account',
    doc_url: 'https://developers.google.com/workspace/admin/directory/v1/guides/delegation',
    placeholder: 'Paste your service account JSON key…',
    trust_pillar: 'AI & ML Protection',
  },
];

const CATEGORY_ICONS = {
  'Identity & Access':  { icon: Shield,   color: 'text-blue-500' },
  'Endpoint Security':  { icon: Shield,   color: 'text-red-500' },
  'Cloud / AI Posture': { icon: Globe,    color: 'text-orange-500' },
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    active:   { icon: CheckCircle2, color: 'text-green-500 bg-green-500/10 border-green-500/20', label: 'Connected' },
    expired:  { icon: AlertCircle,  color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', label: 'Expired' },
    revoked:  { icon: X,            color: 'text-red-500 bg-red-500/10 border-red-500/20', label: 'Revoked' },
    error:    { icon: AlertCircle,  color: 'text-red-500 bg-red-500/10 border-red-500/20', label: 'Error' },
  }[status] || { icon: Clock, color: 'text-muted-foreground bg-muted/30 border-muted', label: status };
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

// ─── Connect card ─────────────────────────────────────────────────────────────

function VendorCard({ vendor, connected, onConnect, onDisconnect, onVerify }) {
  const [expanded, setExpanded] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [credential, setCredential] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleConnect = async () => {
    if (!credential.trim()) return;
    setSaving(true);
    try {
      await onConnect(vendor.id, credential.trim(), vendor.credential_type);
      setCredential('');
      setShowInput(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-card border rounded-xl overflow-hidden ${connected ? vendor.border : 'border-[hsl(var(--border))]'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <span className="text-2xl shrink-0">{vendor.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{vendor.name}</span>
            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">{vendor.category}</span>
            {connected && <StatusBadge status={connected.status} />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{vendor.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!connected && (
            <button
              onClick={e => { e.stopPropagation(); setShowInput(true); setExpanded(true); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${vendor.bg} ${vendor.color} border ${vendor.border} hover:opacity-80`}
            >
              <Plus className="w-3 h-3" /> Connect
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[hsl(var(--border))]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Scopes requested</div>
              <p className="text-xs text-foreground">{vendor.scopes}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Feeds into</div>
              <p className="text-xs text-foreground">Trust Score → {vendor.trust_pillar}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg p-3">
            <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">How to get your key:</strong> {vendor.how_to_obtain}
              <a href={vendor.doc_url} target="_blank" rel="noopener noreferrer"
                className="ml-1 text-primary hover:underline inline-flex items-center gap-0.5">
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Connected state */}
          {connected && (
            <div className="flex items-center justify-between bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-green-500" />
                <span className="text-xs text-foreground">Credential stored (encrypted) · Last verified: {connected.last_verified_at ? new Date(connected.last_verified_at).toLocaleDateString() : 'never'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setVerifying(true); onVerify(connected.id).finally(() => setVerifying(false)); }}
                  disabled={verifying}
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                >
                  {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Test
                </button>
                <button
                  onClick={() => onDisconnect(connected.id)}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Connect input */}
          {!connected && showInput && (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={visible ? 'text' : 'password'}
                  value={credential}
                  onChange={e => setCredential(e.target.value)}
                  placeholder={vendor.placeholder}
                  className="w-full px-3 py-2.5 pr-10 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button onClick={() => setVisible(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3 text-green-500" />
                Encrypted with Fernet before storage. Never logged or exposed in plaintext.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleConnect}
                  disabled={!credential.trim() || saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save & Verify'}
                </button>
                <button onClick={() => { setShowInput(false); setCredential(''); }}
                  className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm text-foreground hover:bg-muted">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!connected && !showInput && (
            <button
              onClick={() => setShowInput(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border ${vendor.bg} ${vendor.border} ${vendor.color} hover:opacity-80 transition-opacity`}
            >
              <Plus className="w-4 h-4" /> Connect {vendor.name}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IntegrationsView() {
  const [connected, setConnected] = useState({});  // { vendor_id: credential_record }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/credentials`, { headers: api.getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to load');
      const data = await resp.json();
      const map = {};
      (data.credentials || []).forEach(c => { map[c.vendor] = c; });
      setConnected(map);
    } catch (e) {
      setError('Could not load integrations. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const handleConnect = async (vendor, credential, credentialType) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
        body: JSON.stringify({ vendor, credential, credential_type: credentialType }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save credential');
      }
      showNotice(`✓ ${vendor} connected successfully`);
      await load();
    } catch (e) {
      showNotice(`✗ ${e.message}`);
    }
  };

  const handleDisconnect = async (id) => {
    if (!confirm('Disconnect and delete this credential?')) return;
    await fetch(`${API_BASE_URL}/api/credentials/${id}`, {
      method: 'DELETE',
      headers: api.getAuthHeaders(),
    });
    showNotice('Credential removed.');
    await load();
  };

  const handleVerify = async (id) => {
    const resp = await fetch(`${API_BASE_URL}/api/credentials/${id}/verify`, {
      method: 'POST',
      headers: api.getAuthHeaders(),
    });
    const data = await resp.json().catch(() => ({}));
    showNotice(data.ok ? '✓ Credential verified successfully' : `✗ Verification failed: ${data.detail || 'unknown error'}`);
    await load();
  };

  const categories = [...new Set(VENDORS.map(v => v.category))];
  const connectedCount = Object.keys(connected).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Notice toast */}
      {notice && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${notice.startsWith('✓') ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-red-500/10 border-red-500/30 text-red-600'}`}>
          {notice}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> Security Tool Integrations
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your existing security tools using your own read-only API keys.
            No platform-wide vendor partnerships required — your keys, your data.
          </p>
        </div>
        {connectedCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4" /> {connectedCount} connected
          </div>
        )}
      </div>

      {/* Privacy callout */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl p-4">
        <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <strong className="text-foreground">Bring-your-own-credentials model.</strong>{' '}
          <span className="text-muted-foreground">
            You generate read-only keys from your own vendor admin consoles — we never access your tools with shared platform-level credentials.
            All keys are encrypted with Fernet (AES-128) before storage and are never logged or returned in plaintext.
            Only read-only API scopes are supported — we cannot modify your connected tools.
          </span>
        </div>
      </div>

      {/* Vendor cards by category */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        categories.map(cat => {
          const catVendors = VENDORS.filter(v => v.category === cat);
          const CatIcon = CATEGORY_ICONS[cat]?.icon || Zap;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <CatIcon className={`w-4 h-4 ${CATEGORY_ICONS[cat]?.color || 'text-primary'}`} />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{cat}</h2>
                <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              </div>
              <div className="space-y-2">
                {catVendors.map(v => (
                  <VendorCard
                    key={v.id}
                    vendor={v}
                    connected={connected[v.id] || null}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onVerify={handleVerify}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
