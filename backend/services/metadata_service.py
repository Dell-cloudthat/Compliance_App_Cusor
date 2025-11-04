"""
Metadata Service - Handles data segmentation and metadata tagging
Separated from main API for modularity
"""

import json
from typing import Dict, List, Tuple, Any
from datetime import datetime

class MetadataService:
    """Service for handling metadata tagging and data classification"""
    
    # PII detection patterns
    PII_PATTERNS = {
        'EMAIL': ['email', 'e-mail', 'mail', 'user_email', 'email_address'],
        'SSN': ['ssn', 'social_security', 'social_security_number', 'ss_number'],
        'PHONE': ['phone', 'telephone', 'mobile', 'cell', 'phone_number'],
        'ADDRESS': ['address', 'street', 'city', 'zip', 'postal', 'postal_code'],
        'NAME': ['first_name', 'last_name', 'full_name', 'name', 'username'],
        'DOB': ['date_of_birth', 'dob', 'birth_date', 'birthday'],
        'CREDIT_CARD': ['credit_card', 'card_number', 'cc_number', 'card_no'],
        'IP_ADDRESS': ['ip_address', 'ip', 'ipv4', 'ipv6'],
        'DEVICE_ID': ['device_id', 'device_uuid', 'mac_address', 'serial_number']
    }
    
    # CUI detection keywords (should be filtered)
    CUI_KEYWORDS = [
        'classified', 'secret', 'top_secret', 'federal', 'government',
        'defense', 'military', 'clearance', 'cui', 'controlled_unclassified',
        'for_official_use_only', 'fouo', 'law_enforcement_sensitive'
    ]
    
    @staticmethod
    def detect_pii(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Detect PII in data payload
        
        Returns:
            (has_pii: bool, pii_types: List[str])
        """
        has_pii = False
        pii_types = []
        data_str = json.dumps(data).lower()
        
        for pii_type, keywords in MetadataService.PII_PATTERNS.items():
            if any(keyword in data_str for keyword in keywords):
                has_pii = True
                pii_types.append(pii_type)
        
        return has_pii, pii_types
    
    @staticmethod
    def detect_cui(data: Dict[str, Any], metadata_tags: List[str]) -> bool:
        """
        Detect CUI indicators - Critical for FedRAMP compliance
        
        Returns:
            has_cui: bool (True means data should be REJECTED)
        """
        # Check metadata tags
        tag_str = ' '.join(metadata_tags).upper()
        if any(keyword in tag_str for keyword in ['CUI', 'RESTRICTED', 'CLASSIFIED']):
            return True
        
        # Check data payload
        data_str = json.dumps(data).lower()
        if any(keyword in data_str for keyword in MetadataService.CUI_KEYWORDS):
            return True
        
        return False
    
    @staticmethod
    def classify_data(data: Dict[str, Any], metadata_tags: List[str]) -> str:
        """
        Classify data based on content and metadata
        
        Returns:
            classification: 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'
        """
        has_pii, _ = MetadataService.detect_pii(data)
        has_cui = MetadataService.detect_cui(data, metadata_tags)
        
        if has_cui:
            return "RESTRICTED"  # Should not be ingested
        elif has_pii:
            return "CONFIDENTIAL"
        elif 'ENCRYPTED' in metadata_tags:
            return "INTERNAL"
        elif 'PUBLIC' in metadata_tags:
            return "PUBLIC"
        else:
            return "INTERNAL"  # Default to internal
    
    @staticmethod
    def generate_metadata_tags(
        data: Dict[str, Any],
        existing_tags: List[str],
        data_source_type: str = None
    ) -> List[str]:
        """
        Auto-generate metadata tags based on data content
        
        Returns:
            tags: List of metadata tags
        """
        tags = list(existing_tags) if existing_tags else []
        
        # Detect and tag PII
        has_pii, pii_types = MetadataService.detect_pii(data)
        if has_pii:
            tags.append('PII')
            tags.extend([f'PII_{pt}' for pt in pii_types])
        
        # Detect CUI (should be rejected, but tag for logging)
        has_cui = MetadataService.detect_cui(data, tags)
        if has_cui:
            tags.append('CUI_DETECTED')  # Flag for rejection
        
        # Auto-classify
        classification = MetadataService.classify_data(data, tags)
        tags.append(classification)
        
        # Add source-based tags
        if data_source_type:
            if data_source_type.upper() in ['EDR', 'SIEM', 'ENDPOINT']:
                tags.append('ENDPOINT_DATA')
            elif data_source_type.upper() in ['IAM', 'SSO', 'IDENTITY']:
                tags.append('IDENTITY_DATA')
            elif data_source_type.upper() in ['NETWORK', 'FIREWALL']:
                tags.append('NETWORK_DATA')
            elif data_source_type.upper() in ['VULNERABILITY', 'SCANNER']:
                tags.append('VULNERABILITY_DATA')
            elif data_source_type.upper() in ['INCIDENT', 'SOC']:
                tags.append('INCIDENT_DATA')
        
        # Add encryption status if applicable
        if 'encrypted' in json.dumps(data).lower() or 'encryption' in json.dumps(data).lower():
            tags.append('ENCRYPTED')
        
        return list(set(tags))  # Remove duplicates
    
    @staticmethod
    def segment_data_by_control(
        data: Dict[str, Any],
        control_mappings: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """
        Segment data payload by control based on field mappings
        
        Args:
            data: Raw data payload
            control_mappings: Dict of {control_id: [field_names]}
        
        Returns:
            segments: Dict of {control_id: segmented_data}
        """
        segments = {}
        data_str_lower = json.dumps(data).lower()
        
        for control_id, field_names in control_mappings.items():
            segment_data = {}
            
            for field in field_names:
                field_lower = field.lower()
                
                # Check if field exists in data
                if field in data:
                    segment_data[field] = data[field]
                elif field_lower in data_str_lower:
                    # Try to find field in nested structure
                    for key, value in data.items():
                        if field_lower in key.lower():
                            segment_data[key] = value
            
            if segment_data:
                segments[control_id] = segment_data
        
        return segments
    
    @staticmethod
    def determine_coverage_type(
        data_source_type: str,
        responsible_party: str,
        is_vendor: bool = False,
        is_mdr: bool = False
    ) -> str:
        """
        Determine coverage type for responsibility matrix
        
        Returns:
            coverage_type: 'MDR/SOC Managed', 'Vendor Inherited', 'API Data Attribution', 'Internal'
        """
        if is_mdr:
            return "MDR/SOC Managed"
        elif is_vendor:
            return "Vendor Inherited"
        elif data_source_type.upper() in ['API', 'WEBHOOK', 'INTEGRATION']:
            return "API Data Attribution"
        else:
            return "Internal"

