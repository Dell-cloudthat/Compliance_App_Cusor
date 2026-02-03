"""
Consent Platform Python SDK

A Python SDK for integrating with the Consent as a Service Platform.

Example:
    from consent_platform import ConsentClient
    
    client = ConsentClient(
        api_url="https://api.consent-platform.com",
        api_key="your-api-key",
        tenant_id="your-tenant-id"
    )
    
    # Issue consent
    token = client.issue_consent(
        user_id="user_123",
        purposes=["analytics", "marketing"],
        vendors=["meta", "google"]
    )
    
    # Validate token
    is_valid = client.validate_token(token.consent_token)
    
    # Send event
    result = client.send_event(
        consent_token=token.consent_token,
        event_type="purchase",
        vendor="meta",
        user_id="user_123",
        value=99.99
    )
"""

from .client import ConsentClient
from .models import (
    ConsentToken,
    ConsentRequest,
    EventRequest,
    EventResponse,
    TokenValidation,
    TCFString,
    GCMSettings,
)
from .exceptions import (
    ConsentPlatformError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    NetworkError,
)
from .webhook import WebhookHandler

__version__ = "1.0.0"
__all__ = [
    "ConsentClient",
    "ConsentToken",
    "ConsentRequest",
    "EventRequest",
    "EventResponse",
    "TokenValidation",
    "TCFString",
    "GCMSettings",
    "ConsentPlatformError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
    "NetworkError",
    "WebhookHandler",
]
