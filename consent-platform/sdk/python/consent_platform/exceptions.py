"""
Exceptions for the Consent Platform SDK
"""

from typing import Optional, Dict, Any


class ConsentPlatformError(Exception):
    """Base exception for Consent Platform SDK"""
    
    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response = response
    
    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class AuthenticationError(ConsentPlatformError):
    """Raised when authentication fails (401)"""
    pass


class AuthorizationError(ConsentPlatformError):
    """Raised when authorization fails (403)"""
    pass


class RateLimitError(ConsentPlatformError):
    """Raised when rate limit is exceeded (429)"""
    
    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        limit: Optional[int] = None,
        remaining: Optional[int] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining


class ValidationError(ConsentPlatformError):
    """Raised when request validation fails (400)"""
    
    def __init__(
        self,
        message: str,
        errors: Optional[list] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.errors = errors or []


class NotFoundError(ConsentPlatformError):
    """Raised when a resource is not found (404)"""
    pass


class NetworkError(ConsentPlatformError):
    """Raised when a network error occurs"""
    pass


class TokenExpiredError(ConsentPlatformError):
    """Raised when a consent token has expired"""
    pass


class TokenInvalidError(ConsentPlatformError):
    """Raised when a consent token is invalid"""
    pass


class WebhookVerificationError(ConsentPlatformError):
    """Raised when webhook signature verification fails"""
    pass
