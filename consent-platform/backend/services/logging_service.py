"""
Structured JSON Logging Service

Features:
- JSON formatted logs for easy parsing
- Request ID tracing across services
- Log levels configuration
- Context propagation
"""

import json
import logging
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from contextvars import ContextVar
from functools import wraps


# Context variable for request ID
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
tenant_id_var: ContextVar[Optional[str]] = ContextVar('tenant_id', default=None)


def get_request_id() -> Optional[str]:
    """Get current request ID from context"""
    return request_id_var.get()


def set_request_id(request_id: str):
    """Set request ID in context"""
    request_id_var.set(request_id)


def get_tenant_id() -> Optional[str]:
    """Get current tenant ID from context"""
    return tenant_id_var.get()


def set_tenant_id(tenant_id: str):
    """Set tenant ID in context"""
    tenant_id_var.set(tenant_id)


def generate_request_id() -> str:
    """Generate a new request ID"""
    return f"req_{uuid.uuid4().hex[:16]}"


class JSONFormatter(logging.Formatter):
    """
    Format log records as JSON.
    
    Output format:
    {
        "timestamp": "2026-02-02T10:15:30.123456Z",
        "level": "INFO",
        "message": "Request processed",
        "request_id": "req_abc123",
        "tenant_id": "demo-tenant",
        "service": "consent-platform",
        "extra": {...}
    }
    """
    
    def __init__(self, service_name: str = "consent-platform"):
        super().__init__()
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "service": self.service_name,
        }
        
        # Add request context
        request_id = get_request_id()
        if request_id:
            log_data["request_id"] = request_id
        
        tenant_id = get_tenant_id()
        if tenant_id:
            log_data["tenant_id"] = tenant_id
        
        # Add location info
        if record.pathname:
            log_data["location"] = {
                "file": record.filename,
                "line": record.lineno,
                "function": record.funcName
            }
        
        # Add exception info
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)
            }
        
        # Add extra fields
        extra = {}
        for key, value in record.__dict__.items():
            if key not in [
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'pathname', 'process', 'processName', 'relativeCreated',
                'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                'message', 'asctime'
            ]:
                extra[key] = value
        
        if extra:
            log_data["extra"] = extra
        
        return json.dumps(log_data)


class StructuredLogger:
    """
    Structured logger with context support.
    
    Usage:
        logger = StructuredLogger("my_service")
        logger.info("Processing request", user_id="123", action="login")
    """
    
    def __init__(self, name: str, level: str = "INFO"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.upper()))
        
        # Remove existing handlers
        self.logger.handlers = []
        
        # Add JSON handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        self.logger.addHandler(handler)
        
        # Prevent propagation to root logger
        self.logger.propagate = False
    
    def _log(self, level: int, message: str, **kwargs):
        """Log with extra context"""
        self.logger.log(level, message, extra=kwargs)
    
    def debug(self, message: str, **kwargs):
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._log(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        self._log(logging.CRITICAL, message, **kwargs)
    
    def exception(self, message: str, **kwargs):
        """Log an exception with traceback"""
        self.logger.exception(message, extra=kwargs)


# Log event types
class LogEvent:
    """Standard log event types"""
    
    # Request lifecycle
    REQUEST_STARTED = "request.started"
    REQUEST_COMPLETED = "request.completed"
    REQUEST_FAILED = "request.failed"
    
    # Authentication
    AUTH_SUCCESS = "auth.success"
    AUTH_FAILED = "auth.failed"
    AUTH_RATE_LIMITED = "auth.rate_limited"
    
    # Consent
    CONSENT_ISSUED = "consent.issued"
    CONSENT_REVOKED = "consent.revoked"
    CONSENT_EXPIRED = "consent.expired"
    CONSENT_VALIDATED = "consent.validated"
    CONSENT_INVALID = "consent.invalid"
    
    # Enforcement
    ENFORCEMENT_ALLOWED = "enforcement.allowed"
    ENFORCEMENT_MODIFIED = "enforcement.modified"
    ENFORCEMENT_BLOCKED = "enforcement.blocked"
    
    # Vendor
    VENDOR_FORWARD_SUCCESS = "vendor.forward.success"
    VENDOR_FORWARD_FAILED = "vendor.forward.failed"
    VENDOR_VIOLATION = "vendor.violation"
    VENDOR_TIER_CHANGED = "vendor.tier_changed"
    
    # Webhook
    WEBHOOK_DELIVERED = "webhook.delivered"
    WEBHOOK_FAILED = "webhook.failed"
    WEBHOOK_RETRYING = "webhook.retrying"
    
    # System
    SERVICE_STARTED = "service.started"
    SERVICE_STOPPED = "service.stopped"
    DATABASE_CONNECTED = "database.connected"
    DATABASE_ERROR = "database.error"


class RequestLogger:
    """
    Context manager for request-scoped logging.
    
    Usage:
        async with RequestLogger(request) as log:
            log.info("Processing", step="validation")
            # ... do work ...
    """
    
    def __init__(self, method: str, path: str, tenant_id: str = None):
        self.method = method
        self.path = path
        self.tenant_id = tenant_id
        self.request_id = generate_request_id()
        self.start_time = None
        self.logger = StructuredLogger("request")
    
    async def __aenter__(self):
        self.start_time = time.time()
        set_request_id(self.request_id)
        if self.tenant_id:
            set_tenant_id(self.tenant_id)
        
        self.logger.info(
            LogEvent.REQUEST_STARTED,
            method=self.method,
            path=self.path,
            request_id=self.request_id
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000
        
        if exc_type:
            self.logger.error(
                LogEvent.REQUEST_FAILED,
                method=self.method,
                path=self.path,
                duration_ms=round(duration_ms, 2),
                error_type=exc_type.__name__,
                error_message=str(exc_val)
            )
        else:
            self.logger.info(
                LogEvent.REQUEST_COMPLETED,
                method=self.method,
                path=self.path,
                duration_ms=round(duration_ms, 2)
            )
        
        # Clear context
        request_id_var.set(None)
        tenant_id_var.set(None)
        
        return False  # Don't suppress exceptions
    
    def info(self, message: str, **kwargs):
        self.logger.info(message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self.logger.warning(message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self.logger.error(message, **kwargs)


# Audit logger for compliance-critical events
class AuditLogger:
    """
    Audit logger for compliance-critical events.
    
    These logs should be preserved for regulatory purposes.
    """
    
    def __init__(self):
        self.logger = StructuredLogger("audit", level="INFO")
    
    def log_consent_issued(self, tenant_id: str, token_id: str, subject_id: str,
                          purposes: list, vendors: list, jurisdiction: str):
        self.logger.info(
            LogEvent.CONSENT_ISSUED,
            tenant_id=tenant_id,
            token_id=token_id,
            subject_id=subject_id,
            purposes=purposes,
            vendors=vendors,
            jurisdiction=jurisdiction
        )
    
    def log_consent_revoked(self, tenant_id: str, token_id: str, subject_id: str, reason: str):
        self.logger.info(
            LogEvent.CONSENT_REVOKED,
            tenant_id=tenant_id,
            token_id=token_id,
            subject_id=subject_id,
            reason=reason
        )
    
    def log_enforcement(self, tenant_id: str, event_id: str, vendor: str,
                       decision: str, reason: str, token_hash: str = None):
        self.logger.info(
            f"enforcement.{decision}",
            tenant_id=tenant_id,
            event_id=event_id,
            vendor=vendor,
            decision=decision,
            reason=reason,
            token_hash=token_hash
        )
    
    def log_vendor_violation(self, vendor_id: str, violation_type: str,
                            severity: str, description: str):
        self.logger.warning(
            LogEvent.VENDOR_VIOLATION,
            vendor_id=vendor_id,
            violation_type=violation_type,
            severity=severity,
            description=description
        )
    
    def log_vendor_tier_changed(self, vendor_id: str, old_tier: str, new_tier: str, reason: str):
        self.logger.warning(
            LogEvent.VENDOR_TIER_CHANGED,
            vendor_id=vendor_id,
            old_tier=old_tier,
            new_tier=new_tier,
            reason=reason
        )


# Create singleton instances
logger = StructuredLogger("consent-platform")
audit_logger = AuditLogger()


def configure_logging(level: str = "INFO", json_output: bool = True):
    """
    Configure global logging settings.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_output: Whether to output JSON formatted logs
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers
    root_logger.handlers = []
    
    # Add handler
    handler = logging.StreamHandler(sys.stdout)
    if json_output:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
    root_logger.addHandler(handler)
