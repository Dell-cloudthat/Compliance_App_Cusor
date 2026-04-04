"""
Main client for the Consent Platform SDK
"""

import hashlib
import hmac
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Union
import httpx

from .models import (
    ConsentToken,
    ConsentRequest,
    EventRequest,
    EventResponse,
    TokenValidation,
    TCFString,
    GCMSettings,
    AuditExport,
)
from .exceptions import (
    ConsentPlatformError,
    AuthenticationError,
    AuthorizationError,
    RateLimitError,
    ValidationError,
    NotFoundError,
    NetworkError,
)


class ConsentClient:
    """
    Client for the Consent as a Service Platform API.
    
    Example:
        client = ConsentClient(
            api_url="https://api.consent-platform.com",
            api_key="csp_live_xxxxx",
            tenant_id="your-tenant-id"
        )
        
        # Issue consent token
        token = client.issue_consent(
            user_id="hashed_user_123",
            purposes=["analytics", "marketing"],
            vendors=["meta", "google"]
        )
        
        # Send ad event
        result = client.send_event(
            consent_token=token.consent_token,
            event_type="purchase",
            vendor="meta",
            user_id="hashed_user_123",
            value=99.99
        )
    """
    
    def __init__(
        self,
        api_url: str,
        api_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        """
        Initialize the Consent Platform client.
        
        Args:
            api_url: Base URL of the Consent Platform API
            api_key: API key for authentication (optional for some endpoints)
            tenant_id: Your tenant ID
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
        """
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.tenant_id = tenant_id
        self.timeout = timeout
        self.max_retries = max_retries
        
        self._client = httpx.Client(timeout=timeout)
    
    def _get_headers(self) -> Dict[str, str]:
        """Build request headers"""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "consent-platform-python/1.0.0",
        }
        
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        
        if self.tenant_id:
            headers["X-Tenant-ID"] = self.tenant_id
        
        return headers
    
    def _handle_response(self, response: httpx.Response) -> Dict[str, Any]:
        """Handle API response and raise appropriate exceptions"""
        if response.status_code == 200 or response.status_code == 201:
            return response.json()
        
        try:
            error_data = response.json()
        except:
            error_data = {"error": "Unknown error", "detail": response.text}
        
        error_message = error_data.get("detail") or error_data.get("error", "Unknown error")
        
        if response.status_code == 401:
            raise AuthenticationError(error_message, status_code=401, response=error_data)
        elif response.status_code == 403:
            raise AuthorizationError(error_message, status_code=403, response=error_data)
        elif response.status_code == 404:
            raise NotFoundError(error_message, status_code=404, response=error_data)
        elif response.status_code == 429:
            raise RateLimitError(
                error_message,
                status_code=429,
                response=error_data,
                retry_after=int(response.headers.get("Retry-After", 60)),
                limit=int(response.headers.get("X-RateLimit-Limit", 0)),
                remaining=int(response.headers.get("X-RateLimit-Remaining", 0)),
            )
        elif response.status_code == 400:
            raise ValidationError(
                error_message,
                status_code=400,
                response=error_data,
                errors=error_data.get("errors", []),
            )
        else:
            raise ConsentPlatformError(error_message, status_code=response.status_code, response=error_data)
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Make an API request with retry logic"""
        url = f"{self.api_url}{endpoint}"
        request_headers = self._get_headers()
        if headers:
            request_headers.update(headers)
        
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                response = self._client.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    headers=request_headers,
                )
                return self._handle_response(response)
            
            except httpx.NetworkError as e:
                last_exception = NetworkError(f"Network error: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                continue
            
            except RateLimitError as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    time.sleep(e.retry_after or 60)
                continue
            
            except ConsentPlatformError:
                raise
        
        if last_exception:
            raise last_exception
        
        raise ConsentPlatformError("Max retries exceeded")
    
    # ==================== Consent ====================
    
    def issue_consent(
        self,
        user_id: str,
        purposes: List[str],
        vendors: List[str],
        ttl_days: int = 14,
        jurisdiction: str = "GDPR",
        constraints: Optional[Dict[str, bool]] = None,
    ) -> ConsentToken:
        """
        Issue a new consent token.
        
        Args:
            user_id: Hashed user identifier
            purposes: List of consented purposes (e.g., ["analytics", "marketing"])
            vendors: List of allowed vendors (e.g., ["meta", "google"])
            ttl_days: Token TTL in days (default: 14)
            jurisdiction: Legal jurisdiction (default: "GDPR")
            constraints: Optional consent constraints
        
        Returns:
            ConsentToken with the issued token
        
        Example:
            token = client.issue_consent(
                user_id="hashed_user_123",
                purposes=["analytics", "marketing"],
                vendors=["meta", "google"],
                ttl_days=30,
                jurisdiction="CPRA"
            )
        """
        data = {
            "user_id": user_id,
            "purposes": purposes,
            "vendors": vendors,
            "ttl_days": ttl_days,
            "jurisdiction": jurisdiction,
        }
        
        if constraints:
            data["constraints"] = constraints
        
        response = self._request("POST", "/consent", data=data)
        return ConsentToken(**response)
    
    def revoke_consent(self, token_id: str, reason: str = "user_requested") -> bool:
        """
        Revoke a consent token.
        
        Args:
            token_id: The token ID to revoke
            reason: Reason for revocation
        
        Returns:
            True if successful
        """
        response = self._request("POST", "/consent/revoke", data={
            "token_id": token_id,
            "reason": reason,
        })
        return response.get("success", False)
    
    def list_tokens(
        self,
        subject_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        List consent tokens.
        
        Args:
            subject_id: Filter by subject ID
            limit: Maximum number of results
        
        Returns:
            List of token metadata
        """
        params = {"limit": limit}
        if subject_id:
            params["subject_id"] = subject_id
        
        response = self._request("GET", "/consent/tokens", params=params)
        return response.get("tokens", [])
    
    # ==================== Events ====================
    
    def send_event(
        self,
        consent_token: str,
        event_type: str,
        vendor: str,
        user_id: str,
        data_classes: Optional[List[str]] = None,
        url: Optional[str] = None,
        value: Optional[float] = None,
        currency: str = "USD",
        properties: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        **kwargs,
    ) -> EventResponse:
        """
        Send an ad event through the enforcement proxy.
        
        Args:
            consent_token: The consent token
            event_type: Type of event (purchase, page_view, add_to_cart, etc.)
            vendor: Target vendor (meta, google, etc.)
            user_id: Hashed user identifier
            data_classes: Data classes in this event
            url: Page URL
            value: Event value (for purchases)
            currency: Currency code
            properties: Custom properties
            idempotency_key: Key for idempotent processing
        
        Returns:
            EventResponse with the enforcement decision
        
        Example:
            result = client.send_event(
                consent_token=token.consent_token,
                event_type="purchase",
                vendor="meta",
                user_id="hashed_user_123",
                value=99.99,
                currency="USD"
            )
            
            if result.decision == "allowed":
                print(f"Event forwarded: {result.vendor_event_id}")
        """
        data = {
            "event_type": event_type,
            "vendor": vendor,
            "user_id": user_id,
            "data_classes": data_classes or [],
            "currency": currency,
            "properties": properties or {},
            **kwargs,
        }
        
        if url:
            data["url"] = url
        if value is not None:
            data["value"] = value
        
        headers = {"Authorization": f"Bearer {consent_token}"}
        if idempotency_key:
            headers["X-Idempotency-Key"] = idempotency_key
        
        response = self._request("POST", "/event", data=data, headers=headers)
        return EventResponse(**response)
    
    def send_event_batch(
        self,
        consent_token: str,
        events: List[EventRequest],
    ) -> List[EventResponse]:
        """
        Send multiple events in a batch.
        
        Args:
            consent_token: The consent token
            events: List of EventRequest objects
        
        Returns:
            List of EventResponse objects
        """
        results = []
        for event in events:
            result = self.send_event(
                consent_token=consent_token,
                **event.model_dump(),
            )
            results.append(result)
        return results
    
    # ==================== TCF 2.2 ====================
    
    def generate_tcf_string(
        self,
        purposes: List[str],
        vendors: List[str],
        language: str = "EN",
    ) -> TCFString:
        """
        Generate a TCF 2.2 consent string.
        
        Args:
            purposes: List of consented purposes
            vendors: List of allowed vendors
            language: Language code (default: "EN")
        
        Returns:
            TCFString with the generated consent string
        
        Example:
            tcf = client.generate_tcf_string(
                purposes=["analytics", "marketing"],
                vendors=["meta", "google"]
            )
            print(f"TC String: {tcf.tc_string}")
        """
        response = self._request("POST", "/tcf/generate", data={
            "purposes": purposes,
            "vendors": vendors,
            "language": language,
        })
        return TCFString(
            tc_string=response["tc_string"],
            version=response["version"],
            created=datetime.fromisoformat(response["created"].replace("Z", "+00:00")),
            tcf_purposes=response["tcf_purposes"],
            tcf_vendors=response["tcf_vendors"],
        )
    
    def decode_tcf_string(self, tc_string: str) -> Dict[str, Any]:
        """
        Decode a TCF consent string.
        
        Args:
            tc_string: The TC string to decode
        
        Returns:
            Decoded TC string data
        """
        response = self._request("GET", "/tcf/decode", params={"tc_string": tc_string})
        return response.get("decoded", {})
    
    def tcf_from_token(self, token: str, language: str = "EN") -> TCFString:
        """
        Generate TCF string from an existing consent token.
        
        Args:
            token: The consent token
            language: Language code
        
        Returns:
            TCFString
        """
        response = self._request("POST", "/tcf/from-token", data={
            "token": token,
            "language": language,
        })
        return TCFString(
            tc_string=response["tc_string"],
            version=2,
            created=datetime.now(timezone.utc),
            tcf_purposes=response["tcf_purposes"],
            tcf_vendors=response["tcf_vendors"],
        )
    
    # ==================== Google Consent Mode ====================
    
    def get_gcm_settings(
        self,
        purposes: List[str],
        region: str = "EU",
    ) -> GCMSettings:
        """
        Get Google Consent Mode v2 settings.
        
        Args:
            purposes: List of consented purposes
            region: Region code (default: "EU")
        
        Returns:
            GCMSettings with consent state for each signal
        
        Example:
            gcm = client.get_gcm_settings(
                purposes=["analytics", "marketing"],
                region="EU"
            )
            # Use with Google tags
        """
        response = self._request("POST", "/gcm/generate", data={
            "purposes": purposes,
            "region": region,
        })
        return GCMSettings(**response["consent_settings"])
    
    def get_gcm_script(self, region: str = "EU") -> str:
        """
        Get the Google Consent Mode default script.
        
        Args:
            region: Region code
        
        Returns:
            JavaScript snippet to place before Google tags
        """
        response = self._request("GET", "/gcm/default-script", params={"region": region})
        return response.get("script", "")
    
    # ==================== Standards ====================
    
    def generate_all_standards(
        self,
        purposes: List[str],
        vendors: List[str],
        language: str = "EN",
        region: str = "EU",
    ) -> Dict[str, Any]:
        """
        Generate all industry standard consent formats at once.
        
        Args:
            purposes: List of consented purposes
            vendors: List of allowed vendors
            language: Language code
            region: Region code
        
        Returns:
            Dictionary with TCF string, GCM settings, and snippets
        """
        return self._request("POST", "/standards/generate-all", data={
            "purposes": purposes,
            "vendors": vendors,
            "language": language,
            "region": region,
        })
    
    # ==================== Audit ====================
    
    def get_decisions(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get enforcement decisions.
        
        Args:
            limit: Maximum number of results
        
        Returns:
            List of decision records
        """
        response = self._request("GET", "/decisions", params={"limit": limit})
        return response.get("decisions", [])
    
    def export_audit(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> AuditExport:
        """
        Export audit data.
        
        Args:
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
        
        Returns:
            AuditExport with events and verification
        """
        params = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        
        response = self._request("GET", "/audit/export", params=params)
        return AuditExport(
            tenant_id=response["tenant_id"],
            export_time=datetime.fromisoformat(response["export_time"].replace("Z", "+00:00")),
            events_count=response["events_count"],
            chain_valid=response["chain_valid"],
            events=response.get("events", []),
        )
    
    def verify_audit_chain(self) -> Dict[str, Any]:
        """
        Verify the audit chain integrity.
        
        Returns:
            Verification result
        """
        return self._request("GET", "/audit/verify")
    
    # ==================== Vendors ====================
    
    def list_vendors(self) -> List[Dict[str, Any]]:
        """List configured vendors"""
        response = self._request("GET", "/vendors")
        return response.get("vendors", [])
    
    # ==================== Health ====================
    
    def health_check(self) -> Dict[str, Any]:
        """Check API health"""
        return self._request("GET", "/health")
    
    # ==================== Context Manager ====================
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self._client.close()
    
    def close(self):
        """Close the HTTP client"""
        self._client.close()


class AsyncConsentClient:
    """
    Async client for the Consent as a Service Platform API.
    
    Example:
        async with AsyncConsentClient(
            api_url="https://api.consent-platform.com",
            api_key="your-api-key",
            tenant_id="your-tenant-id"
        ) as client:
            token = await client.issue_consent(
                user_id="user_123",
                purposes=["analytics"],
                vendors=["meta"]
            )
    """
    
    def __init__(
        self,
        api_url: str,
        api_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.tenant_id = tenant_id
        self.timeout = timeout
        self.max_retries = max_retries
        
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client
    
    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "consent-platform-python/1.0.0",
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        if self.tenant_id:
            headers["X-Tenant-ID"] = self.tenant_id
        return headers
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        client = await self._get_client()
        url = f"{self.api_url}{endpoint}"
        request_headers = self._get_headers()
        if headers:
            request_headers.update(headers)
        
        response = await client.request(
            method=method,
            url=url,
            json=data,
            params=params,
            headers=request_headers,
        )
        
        if response.status_code in (200, 201):
            return response.json()
        
        # Handle errors (simplified for async)
        try:
            error_data = response.json()
        except:
            error_data = {"error": response.text}
        
        raise ConsentPlatformError(
            error_data.get("detail", "Unknown error"),
            status_code=response.status_code,
            response=error_data,
        )
    
    async def issue_consent(
        self,
        user_id: str,
        purposes: List[str],
        vendors: List[str],
        **kwargs,
    ) -> ConsentToken:
        """Issue a consent token (async)"""
        data = {"user_id": user_id, "purposes": purposes, "vendors": vendors, **kwargs}
        response = await self._request("POST", "/consent", data=data)
        return ConsentToken(**response)
    
    async def send_event(
        self,
        consent_token: str,
        event_type: str,
        vendor: str,
        user_id: str,
        **kwargs,
    ) -> EventResponse:
        """Send an event (async)"""
        data = {"event_type": event_type, "vendor": vendor, "user_id": user_id, **kwargs}
        headers = {"Authorization": f"Bearer {consent_token}"}
        response = await self._request("POST", "/event", data=data, headers=headers)
        return EventResponse(**response)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()
    
    async def close(self):
        if self._client:
            await self._client.aclose()
