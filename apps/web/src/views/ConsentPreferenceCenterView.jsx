import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  History,
  Download,
  Trash2,
  Mail,
  Lock,
  Globe,
  AlertTriangle,
  Save,
  RefreshCw,
} from 'lucide-react';
import { widgetApi, subjectApi, dsarApi, consentApi } from '../services/consentApi';

/**
 * ConsentPreferenceCenterView - User-facing preference center
 * 
 * This view allows users to:
 * 1. View and modify their consent preferences
 * 2. View their consent history
 * 3. Submit DSAR requests (data access, deletion, etc.)
 * 4. Download their data
 */

const ConsentPreferenceCenterView = ({ 
  organizationId = 'demo-org-001',
  subjectId = null, // If provided, loads existing subject
  onSave = () => {},
  embedded = false, // If true, renders as embeddable component
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [expandedPurpose, setExpandedPurpose] = useState(null);
  const [activeSection, setActiveSection] = useState('preferences');
  const [showDSARModal, setShowDSARModal] = useState(false);
  const [dsarType, setDsarType] = useState(null);
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [consentHistory, setConsentHistory] = useState([]);

  useEffect(() => {
    loadConfig();
  }, [organizationId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const configData = await widgetApi.getConfig(organizationId);
      setConfig(configData);
      
      // Initialize preferences from config
      const initialPrefs = {};
      (configData.purposes || []).forEach(purpose => {
        initialPrefs[purpose.id] = purpose.is_essential || purpose.default_enabled || false;
      });
      setPreferences(initialPrefs);

      // Load consent history if subject exists
      if (subjectId) {
        try {
          const statusRes = await consentApi.getStatus(organizationId, subjectId);
          const historyPrefs = {};
          (statusRes.purposes || []).forEach(p => {
            historyPrefs[p.purpose_id] = p.granted;
          });
          setPreferences(prev => ({ ...prev, ...historyPrefs }));
        } catch (err) {
          console.log('No existing consent found');
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    setLoading(false);
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const consentsToSave = Object.entries(preferences).map(([purposeId, granted]) => ({
        purpose_id: purposeId,
        granted,
      }));

      await widgetApi.submitConsent(organizationId, {
        subject_identifier: email || `anon_${Date.now()}`,
        consents: consentsToSave,
        consent_method: 'preference_center',
        source_url: window.location.href,
      });

      setSuccessMessage('Your preferences have been saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      onSave(preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
    setSaving(false);
  };

  const handleAcceptAll = () => {
    const allAccepted = {};
    (config?.purposes || []).forEach(purpose => {
      allAccepted[purpose.id] = true;
    });
    setPreferences(allAccepted);
  };

  const handleRejectAll = () => {
    const allRejected = {};
    (config?.purposes || []).forEach(purpose => {
      allRejected[purpose.id] = purpose.is_essential;
    });
    setPreferences(allRejected);
  };

  const togglePreference = (purposeId, isEssential) => {
    if (isEssential) return;
    setPreferences(prev => ({
      ...prev,
      [purposeId]: !prev[purposeId],
    }));
  };

  const submitDSAR = async () => {
    if (!email || !dsarType) {
      alert('Please provide your email address');
      return;
    }

    try {
      await dsarApi.create(organizationId, {
        request_type: dsarType,
        requestor_email: email,
      });
      setSuccessMessage(`Your ${dsarType} request has been submitted. We'll contact you at ${email} within 30 days.`);
      setShowDSARModal(false);
      setDsarType(null);
    } catch (error) {
      console.error('Failed to submit DSAR:', error);
      alert('Failed to submit request. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={`${embedded ? '' : 'min-h-screen'} bg-gray-50 flex items-center justify-center`}>
        <RefreshCw size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const organization = config?.organization || {};
  const purposes = config?.purposes || [];
  const primaryColor = organization.primary_color || '#3B82F6';

  const containerClass = embedded 
    ? 'bg-white rounded-xl border border-gray-200 overflow-hidden'
    : 'min-h-screen bg-gray-50';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div 
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-8"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` 
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-white/20">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Privacy Preference Center</h1>
              <p className="text-white/80 text-sm">{organization.name}</p>
            </div>
          </div>
          <p className="text-white/90 max-w-2xl">
            Control how your data is collected and used. You can change your preferences at any time. 
            Your choices will be saved and applied immediately.
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="max-w-3xl mx-auto px-6 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="text-green-500" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6">
          <nav className="flex gap-8">
            {[
              { id: 'preferences', label: 'Cookie Preferences', icon: Shield },
              { id: 'history', label: 'Consent History', icon: History },
              { id: 'rights', label: 'Your Rights', icon: Lock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`
                  flex items-center gap-2 py-4 border-b-2 transition-colors text-sm
                  ${activeSection === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {activeSection === 'preferences' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Accept All
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <XCircle size={18} />
                Reject Non-Essential
              </button>
            </div>

            {/* Email Input */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email (optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Provide your email to link your preferences across devices and receive updates about your consent.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Consent Purposes */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Cookie Categories</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Select which categories of cookies you want to allow.
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {purposes.map((purpose) => (
                  <div key={purpose.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() => setExpandedPurpose(
                          expandedPurpose === purpose.id ? null : purpose.id
                        )}
                        className="flex items-start gap-3 text-left flex-1"
                      >
                        <div className="mt-1">
                          {expandedPurpose === purpose.id ? (
                            <ChevronUp size={16} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{purpose.name}</span>
                            {purpose.is_essential && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                                Always Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{purpose.description}</p>
                        </div>
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={preferences[purpose.id] || false}
                          onChange={() => togglePreference(purpose.id, purpose.is_essential)}
                          disabled={purpose.is_essential}
                          className="sr-only peer"
                        />
                        <div className={`
                          w-11 h-6 rounded-full peer 
                          ${purpose.is_essential ? 'bg-green-500 cursor-not-allowed' : 'bg-gray-200'}
                          peer-checked:bg-green-500
                          peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300
                          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                          after:bg-white after:rounded-full after:h-5 after:w-5
                          after:transition-all peer-checked:after:translate-x-full
                        `} />
                      </label>
                    </div>

                    {/* Expanded Details */}
                    {expandedPurpose === purpose.id && (
                      <div className="mt-4 ml-9 p-4 bg-gray-50 rounded-lg text-sm space-y-3">
                        <div className="flex items-center gap-2">
                          <Info size={14} className="text-gray-400" />
                          <span className="text-gray-600">
                            Legal basis: <span className="font-medium">{purpose.legal_basis?.replace('_', ' ')}</span>
                          </span>
                        </div>
                        {purpose.data_categories?.length > 0 && (
                          <div>
                            <p className="text-gray-500 mb-1">Data categories collected:</p>
                            <div className="flex flex-wrap gap-2">
                              {purpose.data_categories.map((cat) => (
                                <span key={cat} className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-600">
                                  {cat.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {purpose.third_parties?.length > 0 && (
                          <div>
                            <p className="text-gray-500 mb-1">Third parties involved:</p>
                            <div className="flex flex-wrap gap-2">
                              {purpose.third_parties.map((party) => (
                                <span key={party} className="px-2 py-1 bg-blue-100 rounded text-xs text-blue-700">
                                  {party}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {purpose.retention_period_days && (
                          <div className="flex items-center gap-2">
                            <History size={14} className="text-gray-400" />
                            <span className="text-gray-600">
                              Retention period: <span className="font-medium">{purpose.retention_period_days} days</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4">
              <a
                href={organization.privacy_policy_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                View Privacy Policy <ExternalLink size={14} />
              </a>
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {activeSection === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <History size={20} className="text-blue-500" />
                Your Consent History
              </h2>
              
              {consentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No consent history available yet.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Your consent decisions will appear here after you save your preferences.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consentHistory.map((record, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        record.granted ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {record.granted ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{record.purpose_name}</p>
                        <p className="text-xs text-gray-500">{record.date}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        record.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {record.granted ? 'Accepted' : 'Rejected'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Current Consent Status</h3>
              <div className="space-y-3">
                {purposes.map((purpose) => (
                  <div key={purpose.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{purpose.name}</span>
                    {preferences[purpose.id] ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle2 size={14} />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <XCircle size={14} />
                        Inactive
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'rights' && (
          <div className="space-y-6">
            {/* Rights Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock size={20} className="text-purple-500" />
                Your Privacy Rights
              </h2>
              <p className="text-gray-600 mb-6">
                Under data protection regulations (GDPR, CCPA, etc.), you have specific rights regarding your personal data:
              </p>
              
              <div className="grid gap-4">
                {[
                  {
                    title: 'Right to Access',
                    description: 'Request a copy of all personal data we hold about you.',
                    type: 'access',
                    icon: Download,
                    color: 'blue',
                  },
                  {
                    title: 'Right to Deletion',
                    description: 'Request deletion of your personal data from our systems.',
                    type: 'deletion',
                    icon: Trash2,
                    color: 'red',
                  },
                  {
                    title: 'Right to Rectification',
                    description: 'Request correction of inaccurate personal data.',
                    type: 'rectification',
                    icon: Mail,
                    color: 'amber',
                  },
                  {
                    title: 'Right to Data Portability',
                    description: 'Receive your data in a portable, machine-readable format.',
                    type: 'portability',
                    icon: Download,
                    color: 'green',
                  },
                ].map((right) => (
                  <div 
                    key={right.type}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg bg-${right.color}-100`}>
                      <right.icon size={20} className={`text-${right.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{right.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{right.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        setDsarType(right.type);
                        setShowDSARModal(true);
                      }}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Request
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Globe size={18} />
                Data Protection Contact
              </h3>
              <p className="text-sm text-blue-800">
                For any questions about how we handle your data, please contact our Data Protection Officer at{' '}
                <a href="mailto:privacy@example.com" className="underline">privacy@example.com</a>
              </p>
            </div>

            {/* Response Time Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-amber-800">Response Time</p>
                <p className="text-sm text-amber-700 mt-1">
                  We will respond to all data subject access requests within 30 days as required by GDPR. 
                  Complex requests may require an additional 60 days.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DSAR Modal */}
      {showDSARModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Submit {dsarType?.replace('_', ' ')} Request
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide your email address to submit this request. We'll verify your identity 
              and respond within 30 days.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDSARModal(false);
                  setDsarType(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitDSAR}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!embedded && (
        <footer className="border-t border-gray-200 bg-white py-6 mt-8">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-sm text-gray-500">
              Powered by <span className="font-medium">Consent as a Service Platform</span>
            </p>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
              <a href="#" className="hover:text-gray-600">Terms of Service</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-600">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-600">Cookie Policy</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ConsentPreferenceCenterView;
