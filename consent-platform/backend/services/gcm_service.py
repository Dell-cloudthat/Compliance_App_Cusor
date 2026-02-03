"""
Google Consent Mode v2 Service

Implements Google's Consent Mode API for controlling Google tags based on consent.
https://developers.google.com/tag-platform/security/guides/consent

Consent Mode v2 Features:
- Consent signals: ad_storage, analytics_storage, ad_user_data, ad_personalization
- Advanced consent mode (behavioral modeling when consent denied)
- Region-specific defaults
- Integration with Google Tag Manager

Required for:
- Google Ads in EU/EEA/UK
- Google Analytics 4 in EU/EEA/UK
- Google Tag Manager
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum


# ============== Consent States ==============

class ConsentState(str, Enum):
    """Google Consent Mode consent states"""
    GRANTED = "granted"
    DENIED = "denied"


# ============== Consent Types ==============

class GCMConsentType(str, Enum):
    """Google Consent Mode v2 consent types"""
    AD_STORAGE = "ad_storage"              # Enables storage for advertising (cookies)
    ANALYTICS_STORAGE = "analytics_storage" # Enables storage for analytics
    AD_USER_DATA = "ad_user_data"          # Consent to send user data to Google for ads
    AD_PERSONALIZATION = "ad_personalization"  # Consent for personalized advertising
    FUNCTIONALITY_STORAGE = "functionality_storage"  # Enables functionality cookies
    PERSONALIZATION_STORAGE = "personalization_storage"  # Enables personalization cookies
    SECURITY_STORAGE = "security_storage"  # Enables security cookies (always granted)


# ============== Models ==============

class GCMConsentSettings(BaseModel):
    """Google Consent Mode consent settings"""
    ad_storage: ConsentState = ConsentState.DENIED
    analytics_storage: ConsentState = ConsentState.DENIED
    ad_user_data: ConsentState = ConsentState.DENIED
    ad_personalization: ConsentState = ConsentState.DENIED
    functionality_storage: ConsentState = ConsentState.GRANTED
    personalization_storage: ConsentState = ConsentState.DENIED
    security_storage: ConsentState = ConsentState.GRANTED  # Always granted
    
    # Metadata
    wait_for_update: Optional[int] = None  # ms to wait for consent update
    region: Optional[List[str]] = None     # Region codes (e.g., ["EU", "US-CA"])


class GCMDefaultSettings(BaseModel):
    """Default consent settings per region"""
    region: List[str]  # e.g., ["EU", "EEA", "UK"]
    settings: GCMConsentSettings


class GCMUpdatePayload(BaseModel):
    """Payload for consent update"""
    ad_storage: Optional[ConsentState] = None
    analytics_storage: Optional[ConsentState] = None
    ad_user_data: Optional[ConsentState] = None
    ad_personalization: Optional[ConsentState] = None
    functionality_storage: Optional[ConsentState] = None
    personalization_storage: Optional[ConsentState] = None


class GCMTagConfig(BaseModel):
    """Configuration for Google tags"""
    gtm_container_id: Optional[str] = None  # e.g., "GTM-XXXXX"
    ga4_measurement_id: Optional[str] = None  # e.g., "G-XXXXXXXX"
    ads_conversion_id: Optional[str] = None  # e.g., "AW-XXXXXXXXX"
    
    # Advanced consent mode
    ads_data_redaction: bool = True  # Redact ad click info when consent denied
    url_passthrough: bool = True     # Pass ad click info via URL when consent denied
    
    # Behavioral modeling (requires consent mode)
    enable_behavioral_modeling: bool = True


class GCMSnippet(BaseModel):
    """Generated code snippet for website"""
    default_consent_script: str
    update_consent_function: str
    gtag_config: Optional[str] = None


# ============== Purpose Mapping ==============

# Map our purposes to GCM consent types
PURPOSE_TO_GCM_MAP: Dict[str, List[GCMConsentType]] = {
    "analytics": [
        GCMConsentType.ANALYTICS_STORAGE,
    ],
    "retargeting": [
        GCMConsentType.AD_STORAGE,
        GCMConsentType.AD_USER_DATA,
        GCMConsentType.AD_PERSONALIZATION,
    ],
    "marketing": [
        GCMConsentType.AD_STORAGE,
        GCMConsentType.AD_USER_DATA,
    ],
    "advertising": [
        GCMConsentType.AD_STORAGE,
        GCMConsentType.AD_USER_DATA,
        GCMConsentType.AD_PERSONALIZATION,
    ],
    "personalization": [
        GCMConsentType.PERSONALIZATION_STORAGE,
    ],
    "functional": [
        GCMConsentType.FUNCTIONALITY_STORAGE,
    ],
}


# ============== GCM Service ==============

class GCMService:
    """
    Google Consent Mode v2 Service
    
    Provides:
    - Consent signal mapping from our purposes to GCM
    - JavaScript snippet generation
    - Default settings per region
    - Update payload generation for gtag
    """
    
    def __init__(self):
        # Default settings for EU/EEA
        self.eu_defaults = GCMConsentSettings(
            ad_storage=ConsentState.DENIED,
            analytics_storage=ConsentState.DENIED,
            ad_user_data=ConsentState.DENIED,
            ad_personalization=ConsentState.DENIED,
            wait_for_update=500,  # Wait 500ms for CMP
        )
        
        # Default settings for non-EU
        self.row_defaults = GCMConsentSettings(
            ad_storage=ConsentState.GRANTED,
            analytics_storage=ConsentState.GRANTED,
            ad_user_data=ConsentState.GRANTED,
            ad_personalization=ConsentState.GRANTED,
        )
    
    def map_purposes_to_gcm(self, purposes: List[str], 
                            all_consented: bool = False) -> GCMConsentSettings:
        """
        Map our consent purposes to GCM consent settings.
        
        Args:
            purposes: List of consented purpose names
            all_consented: If True, grant all consent types
        
        Returns:
            GCMConsentSettings with appropriate states
        """
        settings = GCMConsentSettings()
        
        if all_consented:
            return GCMConsentSettings(
                ad_storage=ConsentState.GRANTED,
                analytics_storage=ConsentState.GRANTED,
                ad_user_data=ConsentState.GRANTED,
                ad_personalization=ConsentState.GRANTED,
                functionality_storage=ConsentState.GRANTED,
                personalization_storage=ConsentState.GRANTED,
            )
        
        # Map each purpose to GCM types
        granted_types = set()
        for purpose in purposes:
            if purpose.lower() in PURPOSE_TO_GCM_MAP:
                granted_types.update(PURPOSE_TO_GCM_MAP[purpose.lower()])
        
        # Set consent states
        if GCMConsentType.AD_STORAGE in granted_types:
            settings.ad_storage = ConsentState.GRANTED
        if GCMConsentType.ANALYTICS_STORAGE in granted_types:
            settings.analytics_storage = ConsentState.GRANTED
        if GCMConsentType.AD_USER_DATA in granted_types:
            settings.ad_user_data = ConsentState.GRANTED
        if GCMConsentType.AD_PERSONALIZATION in granted_types:
            settings.ad_personalization = ConsentState.GRANTED
        if GCMConsentType.PERSONALIZATION_STORAGE in granted_types:
            settings.personalization_storage = ConsentState.GRANTED
        if GCMConsentType.FUNCTIONALITY_STORAGE in granted_types:
            settings.functionality_storage = ConsentState.GRANTED
        
        return settings
    
    def generate_default_consent_script(
        self,
        region: str = "EU",
        wait_for_update: int = 500,
        tag_config: GCMTagConfig = None
    ) -> str:
        """
        Generate the default consent initialization script.
        
        This should be placed BEFORE any Google tags load.
        """
        config = tag_config or GCMTagConfig()
        
        # Determine default settings based on region
        if region.upper() in ["EU", "EEA", "UK", "CH"]:
            defaults = self.eu_defaults
        else:
            defaults = self.row_defaults
        
        script = f'''<!-- Google Consent Mode v2 - Default Settings -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  
  // Set default consent before Google tags load
  gtag('consent', 'default', {{
    'ad_storage': '{defaults.ad_storage.value}',
    'analytics_storage': '{defaults.analytics_storage.value}',
    'ad_user_data': '{defaults.ad_user_data.value}',
    'ad_personalization': '{defaults.ad_personalization.value}',
    'functionality_storage': '{defaults.functionality_storage.value}',
    'personalization_storage': '{defaults.personalization_storage.value}',
    'security_storage': 'granted',
    'wait_for_update': {wait_for_update}
  }});
'''
        
        # Add region-specific defaults if needed
        script += f'''
  // Region-specific defaults (EU/EEA)
  gtag('consent', 'default', {{
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'region': ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
               'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
               'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO', 'CH']
  }});
'''
        
        # Add advanced consent mode settings
        if config.ads_data_redaction:
            script += f'''
  // Advanced consent mode - redact ads data when consent denied
  gtag('set', 'ads_data_redaction', true);
'''
        
        if config.url_passthrough:
            script += f'''
  // URL passthrough - preserve ad click info in URL when cookies denied
  gtag('set', 'url_passthrough', true);
'''
        
        script += '</script>'
        
        return script
    
    def generate_update_consent_script(self, settings: GCMConsentSettings) -> str:
        """
        Generate script to update consent after user makes a choice.
        """
        return f'''<!-- Update Google Consent Mode -->
<script>
  gtag('consent', 'update', {{
    'ad_storage': '{settings.ad_storage.value}',
    'analytics_storage': '{settings.analytics_storage.value}',
    'ad_user_data': '{settings.ad_user_data.value}',
    'ad_personalization': '{settings.ad_personalization.value}',
    'functionality_storage': '{settings.functionality_storage.value}',
    'personalization_storage': '{settings.personalization_storage.value}'
  }});
</script>'''
    
    def generate_update_function(self) -> str:
        """
        Generate a JavaScript function for updating consent.
        This can be called from your consent banner.
        """
        return '''/**
 * Update Google Consent Mode based on user choices
 * @param {Object} consent - Consent choices
 * @param {boolean} consent.analytics - Analytics consent
 * @param {boolean} consent.marketing - Marketing/advertising consent
 * @param {boolean} consent.personalization - Personalization consent
 */
function updateGoogleConsent(consent) {
  if (typeof gtag !== 'function') {
    console.warn('gtag not loaded');
    return;
  }
  
  gtag('consent', 'update', {
    'ad_storage': consent.marketing ? 'granted' : 'denied',
    'analytics_storage': consent.analytics ? 'granted' : 'denied',
    'ad_user_data': consent.marketing ? 'granted' : 'denied',
    'ad_personalization': consent.personalization ? 'granted' : 'denied',
    'functionality_storage': 'granted',
    'personalization_storage': consent.personalization ? 'granted' : 'denied'
  });
  
  // Push event for GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      'event': 'consent_update',
      'consent_analytics': consent.analytics,
      'consent_marketing': consent.marketing,
      'consent_personalization': consent.personalization
    });
  }
}'''
    
    def generate_gtm_snippet(self, container_id: str) -> str:
        """
        Generate Google Tag Manager snippet with consent mode.
        """
        return f'''<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
}})(window,document,'script','dataLayer','{container_id}');</script>
<!-- End Google Tag Manager -->'''
    
    def generate_full_snippet(
        self,
        tag_config: GCMTagConfig,
        region: str = "EU"
    ) -> GCMSnippet:
        """
        Generate complete code snippets for implementation.
        """
        default_script = self.generate_default_consent_script(region, tag_config=tag_config)
        update_function = self.generate_update_function()
        
        gtag_config = None
        if tag_config.gtm_container_id:
            gtag_config = self.generate_gtm_snippet(tag_config.gtm_container_id)
        
        return GCMSnippet(
            default_consent_script=default_script,
            update_consent_function=update_function,
            gtag_config=gtag_config
        )
    
    def generate_server_side_payload(
        self,
        purposes: List[str],
        event_name: str = "consent_update"
    ) -> Dict[str, Any]:
        """
        Generate payload for server-side GTM.
        
        This can be sent to your GTM server container to update
        consent state for server-side tagging.
        """
        settings = self.map_purposes_to_gcm(purposes)
        
        return {
            "event": event_name,
            "consent_state": {
                "ad_storage": settings.ad_storage.value,
                "analytics_storage": settings.analytics_storage.value,
                "ad_user_data": settings.ad_user_data.value,
                "ad_personalization": settings.ad_personalization.value,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    
    def get_consent_info(self) -> Dict[str, Any]:
        """
        Get information about GCM consent types.
        """
        return {
            "consent_types": [
                {
                    "id": "ad_storage",
                    "name": "Advertising Storage",
                    "description": "Enables storage (such as cookies) related to advertising",
                    "required_for": ["Google Ads", "Google Ads Remarketing"],
                },
                {
                    "id": "analytics_storage",
                    "name": "Analytics Storage",
                    "description": "Enables storage (such as cookies) related to analytics",
                    "required_for": ["Google Analytics 4", "Universal Analytics"],
                },
                {
                    "id": "ad_user_data",
                    "name": "Ad User Data",
                    "description": "Consent to send user data to Google for advertising purposes",
                    "required_for": ["Google Ads Conversions", "Enhanced Conversions"],
                },
                {
                    "id": "ad_personalization",
                    "name": "Ad Personalization",
                    "description": "Consent for personalized advertising",
                    "required_for": ["Remarketing", "Similar Audiences"],
                },
            ],
            "advanced_features": {
                "ads_data_redaction": "When ad_storage is denied, ad click identifiers are redacted",
                "url_passthrough": "Pass ad click info via URL parameters when cookies are denied",
                "behavioral_modeling": "Google uses modeling to estimate conversions from users who deny consent",
            },
            "regions_requiring_consent": [
                "EU", "EEA", "UK", "Switzerland"
            ],
        }
    
    def validate_implementation(
        self,
        has_default_consent: bool,
        default_before_tags: bool,
        has_update_mechanism: bool,
        has_ad_user_data: bool,
        has_ad_personalization: bool
    ) -> Dict[str, Any]:
        """
        Validate GCM implementation against requirements.
        
        Returns validation result with any issues found.
        """
        issues = []
        warnings = []
        
        if not has_default_consent:
            issues.append("Missing default consent configuration")
        
        if not default_before_tags:
            issues.append("Default consent must be set BEFORE Google tags load")
        
        if not has_update_mechanism:
            issues.append("Missing mechanism to update consent after user choice")
        
        if not has_ad_user_data:
            warnings.append("ad_user_data consent type not implemented (required for Consent Mode v2)")
        
        if not has_ad_personalization:
            warnings.append("ad_personalization consent type not implemented (required for Consent Mode v2)")
        
        return {
            "valid": len(issues) == 0,
            "v2_compliant": len(issues) == 0 and len(warnings) == 0,
            "issues": issues,
            "warnings": warnings,
        }


# Singleton instance
gcm_service = GCMService()
