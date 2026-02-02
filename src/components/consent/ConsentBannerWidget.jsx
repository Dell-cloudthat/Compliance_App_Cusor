import React, { useState, useEffect } from 'react';
import { Shield, Settings, X, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

/**
 * ConsentBannerWidget - Embeddable cookie/privacy consent banner
 * 
 * This component can be:
 * 1. Used directly in React apps
 * 2. Embedded via script tag (see SDK documentation)
 */

const ConsentBannerWidget = ({
  config = null,
  onAcceptAll = () => {},
  onRejectAll = () => {},
  onSavePreferences = () => {},
  onClose = () => {},
  position = 'bottom',
  visible = true,
}) => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({});
  const [expandedPurpose, setExpandedPurpose] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Default config if none provided
  const defaultConfig = {
    banner: {
      title: 'We value your privacy',
      description: 'We use cookies and similar technologies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
      accept_button_text: 'Accept All',
      reject_button_text: 'Reject All',
      customize_button_text: 'Manage Preferences',
      show_reject_button: true,
      show_customize_button: true,
      position: 'bottom',
      layout: 'bar',
      styling: {
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        buttonColor: '#3B82F6',
        buttonTextColor: '#ffffff',
        borderRadius: '8px',
      },
    },
    purposes: [
      {
        id: 'essential',
        name: 'Essential Cookies',
        description: 'Required for the website to function properly. Cannot be disabled.',
        is_essential: true,
        legal_basis: 'legitimate_interest',
      },
      {
        id: 'analytics',
        name: 'Analytics',
        description: 'Help us understand how visitors interact with our website.',
        is_essential: false,
        legal_basis: 'consent',
        third_parties: ['Google Analytics'],
      },
      {
        id: 'marketing',
        name: 'Marketing & Advertising',
        description: 'Used to deliver personalized advertisements.',
        is_essential: false,
        legal_basis: 'consent',
        third_parties: ['Google Ads', 'Facebook Pixel'],
      },
    ],
    organization: {
      name: 'Your Company',
      privacy_policy_url: '/privacy',
      primary_color: '#3B82F6',
    },
  };

  const bannerConfig = config || defaultConfig;
  const { banner, purposes, organization } = bannerConfig;
  const styling = banner?.styling || defaultConfig.banner.styling;

  // Initialize preferences based on purposes
  useEffect(() => {
    const initialPrefs = {};
    (purposes || []).forEach(purpose => {
      initialPrefs[purpose.id] = purpose.is_essential || purpose.default_enabled || false;
    });
    setPreferences(initialPrefs);
  }, [purposes]);

  // Animation effect
  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const handleAcceptAll = () => {
    const allAccepted = {};
    (purposes || []).forEach(purpose => {
      allAccepted[purpose.id] = true;
    });
    setPreferences(allAccepted);
    onAcceptAll(allAccepted);
  };

  const handleRejectAll = () => {
    const allRejected = {};
    (purposes || []).forEach(purpose => {
      allRejected[purpose.id] = purpose.is_essential;
    });
    setPreferences(allRejected);
    onRejectAll(allRejected);
  };

  const handleSavePreferences = () => {
    onSavePreferences(preferences);
  };

  const togglePreference = (purposeId, isEssential) => {
    if (isEssential) return; // Can't toggle essential cookies
    setPreferences(prev => ({
      ...prev,
      [purposeId]: !prev[purposeId],
    }));
  };

  const togglePurposeExpand = (purposeId) => {
    setExpandedPurpose(expandedPurpose === purposeId ? null : purposeId);
  };

  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    center: 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
    bottom_left: 'bottom-4 left-4 max-w-md',
    bottom_right: 'bottom-4 right-4 max-w-md',
  };

  const animationClasses = {
    top: isAnimating ? 'translate-y-[-100%]' : 'translate-y-0',
    bottom: isAnimating ? 'translate-y-[100%]' : 'translate-y-0',
    center: isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
    bottom_left: isAnimating ? 'translate-x-[-100%]' : 'translate-x-0',
    bottom_right: isAnimating ? 'translate-x-[100%]' : 'translate-x-0',
  };

  return (
    <>
      {/* Overlay for modal/center layout */}
      {(banner?.layout === 'modal' || position === 'center') && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
          onClick={banner?.blocking_mode ? undefined : onClose}
        />
      )}

      {/* Main Banner */}
      <div
        className={`
          fixed z-[9999] transition-all duration-300 ease-out
          ${positionClasses[position] || positionClasses.bottom}
          ${animationClasses[position] || ''}
        `}
        style={{
          backgroundColor: styling.backgroundColor,
          color: styling.textColor,
          borderRadius: position === 'center' || position.includes('_') ? styling.borderRadius : '0',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Header with close button for non-blocking mode */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: `${organization?.primary_color || '#3B82F6'}20` }}
              >
                <Shield 
                  size={24} 
                  style={{ color: organization?.primary_color || '#3B82F6' }} 
                />
              </div>
              <h3 className="text-lg font-semibold">
                {banner?.title || 'We value your privacy'}
              </h3>
            </div>
            {!banner?.blocking_mode && (
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Description */}
          <p className="mt-3 text-sm opacity-80 max-w-3xl">
            {banner?.description || defaultConfig.banner.description}
          </p>

          {/* Preference Center (expandable) */}
          {showPreferences && (
            <div className="mt-4 border rounded-lg overflow-hidden" style={{ borderColor: `${styling.textColor}20` }}>
              <div className="p-3 bg-gray-50 border-b" style={{ borderColor: `${styling.textColor}20` }}>
                <h4 className="font-medium text-sm">Manage Cookie Preferences</h4>
              </div>
              <div className="divide-y" style={{ borderColor: `${styling.textColor}10` }}>
                {(purposes || []).map((purpose) => (
                  <div key={purpose.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => togglePurposeExpand(purpose.id)}
                        className="flex items-center gap-2 text-left flex-1"
                      >
                        {expandedPurpose === purpose.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                        <span className="font-medium text-sm">{purpose.name}</span>
                        {purpose.is_essential && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                            Required
                          </span>
                        )}
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences[purpose.id] || false}
                          onChange={() => togglePreference(purpose.id, purpose.is_essential)}
                          disabled={purpose.is_essential}
                          className="sr-only peer"
                        />
                        <div className={`
                          w-11 h-6 rounded-full peer 
                          ${purpose.is_essential ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200'}
                          peer-checked:bg-blue-500
                          peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300
                          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                          after:bg-white after:rounded-full after:h-5 after:w-5
                          after:transition-all peer-checked:after:translate-x-full
                        `} />
                      </label>
                    </div>
                    {expandedPurpose === purpose.id && (
                      <div className="mt-2 pl-6 text-sm opacity-70">
                        <p>{purpose.description}</p>
                        {purpose.third_parties && purpose.third_parties.length > 0 && (
                          <p className="mt-1 text-xs">
                            <span className="font-medium">Third parties:</span>{' '}
                            {purpose.third_parties.join(', ')}
                          </p>
                        )}
                        {purpose.legal_basis && (
                          <p className="mt-1 text-xs">
                            <span className="font-medium">Legal basis:</span>{' '}
                            {purpose.legal_basis.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-xs opacity-60">
              {organization?.privacy_policy_url && (
                <a
                  href={organization.privacy_policy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
                >
                  Privacy Policy <ExternalLink size={12} />
                </a>
              )}
              {organization?.name && (
                <span>• {organization.name}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              {!showPreferences ? (
                <>
                  {banner?.show_reject_button !== false && (
                    <button
                      onClick={handleRejectAll}
                      className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-100"
                      style={{ borderColor: `${styling.textColor}30` }}
                    >
                      {banner?.reject_button_text || 'Reject All'}
                    </button>
                  )}
                  {banner?.show_customize_button !== false && (
                    <button
                      onClick={() => setShowPreferences(true)}
                      className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-100 flex items-center gap-2"
                      style={{ borderColor: `${styling.textColor}30` }}
                    >
                      <Settings size={16} />
                      {banner?.customize_button_text || 'Manage Preferences'}
                    </button>
                  )}
                  <button
                    onClick={handleAcceptAll}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    style={{
                      backgroundColor: styling.buttonColor,
                      color: styling.buttonTextColor,
                    }}
                  >
                    <Check size={16} />
                    {banner?.accept_button_text || 'Accept All'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-100"
                    style={{ borderColor: `${styling.textColor}30` }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleRejectAll}
                    className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-100"
                    style={{ borderColor: `${styling.textColor}30` }}
                  >
                    Reject All
                  </button>
                  <button
                    onClick={handleSavePreferences}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    style={{
                      backgroundColor: styling.buttonColor,
                      color: styling.buttonTextColor,
                    }}
                  >
                    <Check size={16} />
                    Save Preferences
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConsentBannerWidget;
