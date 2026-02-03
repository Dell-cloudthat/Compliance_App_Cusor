"""
TCF 2.2 (Transparency and Consent Framework) Service

Implements IAB Europe's TCF 2.2 specification for consent management.
https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework

Key Components:
- TC String encoding/decoding (base64url)
- Global Vendor List (GVL) integration
- Purpose mapping to TCF standard purposes
- Consent string generation for ad tech partners

TCF 2.2 TC String Structure:
- Core String (required)
- Disclosed Vendors (optional)
- Allowed Vendors (optional)
- Publisher TC (optional)
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Set
from pydantic import BaseModel, Field
from enum import IntEnum
import base64
import struct
import math


# ============== TCF 2.2 Constants ==============

TCF_VERSION = 2
TCF_POLICY_VERSION = 4  # Current IAB policy version

# TCF Standard Purposes (1-11 in TCF 2.2)
class TCFPurpose(IntEnum):
    """IAB TCF 2.2 Standard Purposes"""
    STORE_ACCESS_INFO = 1                    # Store and/or access information on a device
    SELECT_BASIC_ADS = 2                     # Select basic ads
    CREATE_PERSONALIZED_ADS_PROFILE = 3      # Create a personalized ads profile
    SELECT_PERSONALIZED_ADS = 4              # Select personalized ads
    CREATE_PERSONALIZED_CONTENT_PROFILE = 5  # Create a personalized content profile
    SELECT_PERSONALIZED_CONTENT = 6          # Select personalized content
    MEASURE_AD_PERFORMANCE = 7               # Measure ad performance
    MEASURE_CONTENT_PERFORMANCE = 8          # Measure content performance
    MARKET_RESEARCH = 9                      # Apply market research to generate audience insights
    DEVELOP_IMPROVE_PRODUCTS = 10            # Develop and improve products
    USE_LIMITED_DATA = 11                    # Use limited data to select content (TCF 2.2 new)


# TCF Special Features (1-2)
class TCFSpecialFeature(IntEnum):
    """IAB TCF 2.2 Special Features"""
    USE_PRECISE_GEOLOCATION = 1
    SCAN_DEVICE_CHARACTERISTICS = 2


# TCF Special Purposes (1-2) - Always legitimate interest, no consent
class TCFSpecialPurpose(IntEnum):
    """IAB TCF 2.2 Special Purposes (legitimate interest only)"""
    SECURITY_FRAUD_PREVENTION = 1
    DELIVER_ADS_CONTENT = 2


# ============== Models ==============

class TCFCoreString(BaseModel):
    """TCF 2.2 Core TC String structure"""
    version: int = TCF_VERSION
    created: datetime
    last_updated: datetime
    cmp_id: int
    cmp_version: int
    consent_screen: int = 1
    consent_language: str = "EN"
    vendor_list_version: int
    tcf_policy_version: int = TCF_POLICY_VERSION
    is_service_specific: bool = False
    use_non_standard_stacks: bool = False
    
    # Purpose consents (bitfield for purposes 1-11)
    purpose_consents: Set[int] = set()
    
    # Purpose legitimate interests
    purpose_legitimate_interests: Set[int] = set()
    
    # Special feature opt-ins
    special_feature_opt_ins: Set[int] = set()
    
    # Vendor consents and legitimate interests
    vendor_consents: Set[int] = set()
    vendor_legitimate_interests: Set[int] = set()
    
    # Publisher restrictions (optional)
    publisher_restrictions: List[Dict[str, Any]] = []


class TCFVendor(BaseModel):
    """TCF Vendor from Global Vendor List"""
    id: int
    name: str
    purposes: List[int] = []
    legitimate_interest_purposes: List[int] = []
    flexible_purposes: List[int] = []
    special_purposes: List[int] = []
    features: List[int] = []
    special_features: List[int] = []
    policy_url: Optional[str] = None


class TCStringResult(BaseModel):
    """Result of TC String generation"""
    tc_string: str
    version: int
    created: datetime
    purposes_consented: List[int]
    vendors_consented: List[int]
    
    # For debugging
    decoded: Optional[Dict[str, Any]] = None


# ============== Purpose Mapping ==============

# Map our internal purposes to TCF purposes
PURPOSE_TO_TCF_MAP: Dict[str, List[int]] = {
    "analytics": [
        TCFPurpose.STORE_ACCESS_INFO,
        TCFPurpose.MEASURE_AD_PERFORMANCE,
        TCFPurpose.MEASURE_CONTENT_PERFORMANCE,
        TCFPurpose.MARKET_RESEARCH,
    ],
    "retargeting": [
        TCFPurpose.STORE_ACCESS_INFO,
        TCFPurpose.CREATE_PERSONALIZED_ADS_PROFILE,
        TCFPurpose.SELECT_PERSONALIZED_ADS,
    ],
    "marketing": [
        TCFPurpose.STORE_ACCESS_INFO,
        TCFPurpose.SELECT_BASIC_ADS,
        TCFPurpose.MEASURE_AD_PERFORMANCE,
    ],
    "personalization": [
        TCFPurpose.STORE_ACCESS_INFO,
        TCFPurpose.CREATE_PERSONALIZED_CONTENT_PROFILE,
        TCFPurpose.SELECT_PERSONALIZED_CONTENT,
    ],
    "advertising": [
        TCFPurpose.STORE_ACCESS_INFO,
        TCFPurpose.SELECT_BASIC_ADS,
        TCFPurpose.CREATE_PERSONALIZED_ADS_PROFILE,
        TCFPurpose.SELECT_PERSONALIZED_ADS,
        TCFPurpose.MEASURE_AD_PERFORMANCE,
    ],
}

# Map vendors to TCF vendor IDs (subset of common vendors)
VENDOR_TO_TCF_MAP: Dict[str, int] = {
    "google": 755,      # Google Advertising Products
    "meta": 91,         # Facebook / Meta
    "amazon": 793,      # Amazon Advertising
    "microsoft": 64,    # Microsoft Advertising
    "criteo": 91,       # Criteo
    "thetradedesk": 21, # The Trade Desk
    "adobe": 52,        # Adobe
    "oracle": 136,      # Oracle
    "salesforce": 155,  # Salesforce
    "tiktok": 1017,     # TikTok
}


# ============== Bit Manipulation Utilities ==============

class BitWriter:
    """Utility for writing bits to a byte array"""
    
    def __init__(self):
        self.bits: List[int] = []
    
    def write_int(self, value: int, num_bits: int):
        """Write an integer as num_bits bits"""
        for i in range(num_bits - 1, -1, -1):
            self.bits.append((value >> i) & 1)
    
    def write_bool(self, value: bool):
        """Write a boolean as 1 bit"""
        self.bits.append(1 if value else 0)
    
    def write_datetime(self, dt: datetime):
        """Write datetime as deciseconds since epoch (36 bits)"""
        # TCF uses deciseconds (1/10th of a second) since Jan 1, 2000
        epoch = datetime(2000, 1, 1, tzinfo=timezone.utc)
        deciseconds = int((dt - epoch).total_seconds() * 10)
        self.write_int(deciseconds, 36)
    
    def write_string(self, s: str, length: int):
        """Write a string as 6-bit characters (A=0, B=1, etc.)"""
        for char in s.upper()[:length]:
            if 'A' <= char <= 'Z':
                self.write_int(ord(char) - ord('A'), 6)
            else:
                self.write_int(0, 6)  # Default to 'A' for invalid chars
        # Pad if needed
        for _ in range(length - len(s)):
            self.write_int(0, 6)
    
    def write_bitfield(self, values: Set[int], max_id: int):
        """Write a bitfield for vendor/purpose IDs"""
        for i in range(1, max_id + 1):
            self.write_bool(i in values)
    
    def to_bytes(self) -> bytes:
        """Convert bits to bytes"""
        # Pad to byte boundary
        while len(self.bits) % 8 != 0:
            self.bits.append(0)
        
        result = bytearray()
        for i in range(0, len(self.bits), 8):
            byte = 0
            for j in range(8):
                if i + j < len(self.bits):
                    byte = (byte << 1) | self.bits[i + j]
            result.append(byte)
        
        return bytes(result)
    
    def to_base64url(self) -> str:
        """Convert to base64url string (TCF format)"""
        return base64.urlsafe_b64encode(self.to_bytes()).decode().rstrip('=')


class BitReader:
    """Utility for reading bits from a byte array"""
    
    def __init__(self, data: bytes):
        self.bits: List[int] = []
        for byte in data:
            for i in range(7, -1, -1):
                self.bits.append((byte >> i) & 1)
        self.pos = 0
    
    def read_int(self, num_bits: int) -> int:
        """Read num_bits bits as an integer"""
        value = 0
        for _ in range(num_bits):
            if self.pos < len(self.bits):
                value = (value << 1) | self.bits[self.pos]
                self.pos += 1
        return value
    
    def read_bool(self) -> bool:
        """Read 1 bit as boolean"""
        return self.read_int(1) == 1
    
    def read_datetime(self) -> datetime:
        """Read datetime from 36 bits (deciseconds since epoch)"""
        deciseconds = self.read_int(36)
        epoch = datetime(2000, 1, 1, tzinfo=timezone.utc)
        from datetime import timedelta
        return epoch + timedelta(seconds=deciseconds / 10)
    
    def read_string(self, length: int) -> str:
        """Read a string from 6-bit characters"""
        chars = []
        for _ in range(length):
            code = self.read_int(6)
            chars.append(chr(ord('A') + code))
        return ''.join(chars)
    
    def read_bitfield(self, max_id: int) -> Set[int]:
        """Read a bitfield and return set of IDs"""
        result = set()
        for i in range(1, max_id + 1):
            if self.read_bool():
                result.add(i)
        return result
    
    @classmethod
    def from_base64url(cls, s: str) -> "BitReader":
        """Create from base64url string"""
        # Add padding if needed
        padding = 4 - (len(s) % 4)
        if padding != 4:
            s += '=' * padding
        data = base64.urlsafe_b64decode(s)
        return cls(data)


# ============== TCF Service ==============

class TCFService:
    """
    TCF 2.2 Consent String Service
    
    Generates and decodes IAB-compliant TC strings for
    interoperability with the ad tech ecosystem.
    """
    
    def __init__(self, cmp_id: int = 1, cmp_version: int = 1):
        """
        Initialize TCF service.
        
        Args:
            cmp_id: Your CMP ID (register at https://cmplist.consensu.org/)
            cmp_version: Your CMP version number
        """
        self.cmp_id = cmp_id
        self.cmp_version = cmp_version
        self.vendor_list_version = 1  # Would fetch from GVL in production
    
    def map_purposes_to_tcf(self, purposes: List[str]) -> Set[int]:
        """Map our internal purposes to TCF purpose IDs"""
        tcf_purposes = set()
        for purpose in purposes:
            if purpose in PURPOSE_TO_TCF_MAP:
                tcf_purposes.update(PURPOSE_TO_TCF_MAP[purpose])
        return tcf_purposes
    
    def map_vendors_to_tcf(self, vendors: List[str]) -> Set[int]:
        """Map our vendor names to TCF vendor IDs"""
        tcf_vendors = set()
        for vendor in vendors:
            if vendor.lower() in VENDOR_TO_TCF_MAP:
                tcf_vendors.add(VENDOR_TO_TCF_MAP[vendor.lower()])
        return tcf_vendors
    
    def generate_tc_string(
        self,
        purposes: List[str],
        vendors: List[str],
        language: str = "EN",
        special_features: List[int] = None,
        created: datetime = None,
    ) -> TCStringResult:
        """
        Generate a TCF 2.2 compliant TC string.
        
        Args:
            purposes: List of our internal purpose names
            vendors: List of our vendor names
            language: ISO 639-1 language code
            special_features: List of special feature IDs opted into
            created: Creation timestamp (defaults to now)
        
        Returns:
            TCStringResult with the encoded TC string
        """
        now = created or datetime.now(timezone.utc)
        
        # Map to TCF IDs
        tcf_purposes = self.map_purposes_to_tcf(purposes)
        tcf_vendors = self.map_vendors_to_tcf(vendors)
        
        # Create core string
        core = TCFCoreString(
            version=TCF_VERSION,
            created=now,
            last_updated=now,
            cmp_id=self.cmp_id,
            cmp_version=self.cmp_version,
            consent_language=language[:2].upper(),
            vendor_list_version=self.vendor_list_version,
            purpose_consents=tcf_purposes,
            special_feature_opt_ins=set(special_features or []),
            vendor_consents=tcf_vendors,
        )
        
        # Encode to TC string
        tc_string = self._encode_core_string(core)
        
        return TCStringResult(
            tc_string=tc_string,
            version=TCF_VERSION,
            created=now,
            purposes_consented=sorted(list(tcf_purposes)),
            vendors_consented=sorted(list(tcf_vendors)),
            decoded={
                "version": core.version,
                "cmp_id": core.cmp_id,
                "consent_language": core.consent_language,
                "purposes": sorted(list(tcf_purposes)),
                "vendors": sorted(list(tcf_vendors)),
            }
        )
    
    def _encode_core_string(self, core: TCFCoreString) -> str:
        """Encode TCF core string to base64url"""
        writer = BitWriter()
        
        # Version (6 bits)
        writer.write_int(core.version, 6)
        
        # Created (36 bits)
        writer.write_datetime(core.created)
        
        # LastUpdated (36 bits)
        writer.write_datetime(core.last_updated)
        
        # CmpId (12 bits)
        writer.write_int(core.cmp_id, 12)
        
        # CmpVersion (12 bits)
        writer.write_int(core.cmp_version, 12)
        
        # ConsentScreen (6 bits)
        writer.write_int(core.consent_screen, 6)
        
        # ConsentLanguage (12 bits - 2 chars)
        writer.write_string(core.consent_language, 2)
        
        # VendorListVersion (12 bits)
        writer.write_int(core.vendor_list_version, 12)
        
        # TcfPolicyVersion (6 bits)
        writer.write_int(core.tcf_policy_version, 6)
        
        # IsServiceSpecific (1 bit)
        writer.write_bool(core.is_service_specific)
        
        # UseNonStandardStacks (1 bit)
        writer.write_bool(core.use_non_standard_stacks)
        
        # SpecialFeatureOptIns (12 bits - bitfield)
        writer.write_bitfield(core.special_feature_opt_ins, 12)
        
        # PurposeConsents (24 bits - bitfield for 24 purposes)
        writer.write_bitfield(core.purpose_consents, 24)
        
        # PurposeLegitimateInterests (24 bits)
        writer.write_bitfield(core.purpose_legitimate_interests, 24)
        
        # Purpose one treatment (1 bit) - whether purpose 1 was disclosed
        writer.write_bool(TCFPurpose.STORE_ACCESS_INFO in core.purpose_consents)
        
        # PublisherCC (12 bits - 2 chars country code)
        writer.write_string("AA", 2)  # Default
        
        # Vendor consent section
        # MaxVendorId (16 bits)
        max_vendor_id = max(core.vendor_consents) if core.vendor_consents else 0
        writer.write_int(max_vendor_id, 16)
        
        # IsRangeEncoding (1 bit) - using bitfield for simplicity
        writer.write_bool(False)
        
        # Vendor consent bitfield
        if max_vendor_id > 0:
            writer.write_bitfield(core.vendor_consents, max_vendor_id)
        
        # Vendor legitimate interest section
        max_li_vendor = max(core.vendor_legitimate_interests) if core.vendor_legitimate_interests else 0
        writer.write_int(max_li_vendor, 16)
        writer.write_bool(False)  # Not range encoded
        if max_li_vendor > 0:
            writer.write_bitfield(core.vendor_legitimate_interests, max_li_vendor)
        
        # Publisher restrictions - NumPubRestrictions (12 bits)
        writer.write_int(0, 12)  # No restrictions for now
        
        return writer.to_base64url()
    
    def decode_tc_string(self, tc_string: str) -> Dict[str, Any]:
        """
        Decode a TC string back to its components.
        
        Args:
            tc_string: The TC string to decode
        
        Returns:
            Dictionary with decoded values
        """
        try:
            reader = BitReader.from_base64url(tc_string)
            
            result = {
                "version": reader.read_int(6),
                "created": reader.read_datetime().isoformat(),
                "last_updated": reader.read_datetime().isoformat(),
                "cmp_id": reader.read_int(12),
                "cmp_version": reader.read_int(12),
                "consent_screen": reader.read_int(6),
                "consent_language": reader.read_string(2),
                "vendor_list_version": reader.read_int(12),
                "tcf_policy_version": reader.read_int(6),
                "is_service_specific": reader.read_bool(),
                "use_non_standard_stacks": reader.read_bool(),
                "special_feature_opt_ins": sorted(list(reader.read_bitfield(12))),
                "purpose_consents": sorted(list(reader.read_bitfield(24))),
                "purpose_legitimate_interests": sorted(list(reader.read_bitfield(24))),
            }
            
            return result
            
        except Exception as e:
            return {"error": str(e), "tc_string": tc_string}
    
    def generate_for_consent_token(
        self,
        token_purposes: Dict[str, Any],
        token_vendors: Dict[str, Any],
        language: str = "EN"
    ) -> TCStringResult:
        """
        Generate TC string from our consent token format.
        
        Args:
            token_purposes: Purposes from our consent token
            token_vendors: Vendors from our consent token
            language: Language code
        
        Returns:
            TCStringResult
        """
        # Extract consented purposes
        purposes = [p for p, v in token_purposes.items() if v.get("allowed", False)]
        
        # Extract consented vendors
        vendors = [v for v, data in token_vendors.items() if data.get("allowed", False)]
        
        return self.generate_tc_string(purposes, vendors, language)
    
    def get_tcf_api_response(
        self,
        tc_string: str,
        command: str = "getTCData"
    ) -> Dict[str, Any]:
        """
        Generate response for __tcfapi calls.
        
        This is what the JavaScript API should return.
        
        Args:
            tc_string: The TC string
            command: TCF API command
        
        Returns:
            API response object
        """
        decoded = self.decode_tc_string(tc_string)
        
        if command == "getTCData":
            return {
                "tcString": tc_string,
                "tcfPolicyVersion": decoded.get("tcf_policy_version", TCF_POLICY_VERSION),
                "cmpId": decoded.get("cmp_id", self.cmp_id),
                "cmpVersion": decoded.get("cmp_version", self.cmp_version),
                "gdprApplies": True,
                "eventStatus": "tcloaded",
                "cmpStatus": "loaded",
                "listenerId": None,
                "isServiceSpecific": decoded.get("is_service_specific", False),
                "useNonStandardStacks": decoded.get("use_non_standard_stacks", False),
                "purposeOneTreatment": False,
                "publisherCC": "AA",
                "purpose": {
                    "consents": {str(p): True for p in decoded.get("purpose_consents", [])},
                    "legitimateInterests": {str(p): True for p in decoded.get("purpose_legitimate_interests", [])}
                },
                "vendor": {
                    "consents": {},  # Would be populated from decoded
                    "legitimateInterests": {}
                },
                "specialFeatureOptins": {str(f): True for f in decoded.get("special_feature_opt_ins", [])},
            }
        
        elif command == "ping":
            return {
                "gdprApplies": True,
                "cmpLoaded": True,
                "cmpStatus": "loaded",
                "displayStatus": "hidden",
                "apiVersion": "2.2",
                "cmpVersion": self.cmp_version,
                "cmpId": self.cmp_id,
                "gvlVersion": self.vendor_list_version,
                "tcfPolicyVersion": TCF_POLICY_VERSION
            }
        
        return {"error": f"Unknown command: {command}"}
    
    def get_purpose_info(self) -> List[Dict[str, Any]]:
        """Get information about all TCF purposes"""
        purposes = [
            {"id": 1, "name": "Store and/or access information on a device", "description": "Cookies, device identifiers, or other information can be stored or accessed on your device for the purposes presented to you."},
            {"id": 2, "name": "Select basic ads", "description": "Ads can be shown to you based on the content you're viewing, the app you're using, your approximate location, or your device type."},
            {"id": 3, "name": "Create a personalised ads profile", "description": "A profile can be built about you and your interests to show you personalised ads that are relevant to you."},
            {"id": 4, "name": "Select personalised ads", "description": "Personalised ads can be shown to you based on a profile about you."},
            {"id": 5, "name": "Create a personalised content profile", "description": "A profile can be built about you and your interests to show you personalised content that is relevant to you."},
            {"id": 6, "name": "Select personalised content", "description": "Personalised content can be shown to you based on a profile about you."},
            {"id": 7, "name": "Measure ad performance", "description": "The performance and effectiveness of ads that you see or interact with can be measured."},
            {"id": 8, "name": "Measure content performance", "description": "The performance and effectiveness of content that you see or interact with can be measured."},
            {"id": 9, "name": "Apply market research to generate audience insights", "description": "Market research can be used to learn more about the audiences who visit sites/apps and view ads."},
            {"id": 10, "name": "Develop and improve products", "description": "Your data can be used to improve existing systems and software, and to develop new products."},
            {"id": 11, "name": "Use limited data to select content", "description": "Content can be selected based on limited data, such as the content you're viewing or the app you're using."},
        ]
        return purposes


# Singleton instance
tcf_service = TCFService(cmp_id=1, cmp_version=1)
