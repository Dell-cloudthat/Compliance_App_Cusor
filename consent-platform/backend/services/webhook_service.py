"""
Webhook Notification Service

Delivers real-time event notifications to customer endpoints.

Features:
- Async delivery with retry
- HMAC signature for verification
- Event filtering
- Delivery logging
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from enum import Enum
import hashlib
import hmac
import json
import asyncio
import httpx
import uuid

from .database import db


# ============== Enums ==============

class WebhookEvent(str, Enum):
    """Events that can trigger webhooks"""
    # Consent events
    CONSENT_ISSUED = "consent.issued"
    CONSENT_REVOKED = "consent.revoked"
    CONSENT_EXPIRED = "consent.expired"
    
    # Enforcement events
    ENFORCEMENT_ALLOWED = "enforcement.allowed"
    ENFORCEMENT_MODIFIED = "enforcement.modified"
    ENFORCEMENT_BLOCKED = "enforcement.blocked"
    
    # Admin events
    VENDOR_ADDED = "vendor.added"
    VENDOR_REMOVED = "vendor.removed"
    POLICY_UPDATED = "policy.updated"


class DeliveryStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


# ============== Models ==============

class WebhookPayload(BaseModel):
    """Payload sent to webhook endpoints"""
    id: str  # Unique event ID
    event: str  # Event type
    created_at: datetime
    tenant_id: str
    data: Dict[str, Any]
    
    # For idempotency
    idempotency_key: str


class WebhookDelivery(BaseModel):
    """Record of a webhook delivery attempt"""
    id: str
    webhook_id: str
    event_id: str
    status: DeliveryStatus
    attempts: int
    last_attempt_at: Optional[datetime]
    response_code: Optional[int]
    response_body: Optional[str]
    error: Optional[str]
    next_retry_at: Optional[datetime]


class WebhookConfig(BaseModel):
    """Webhook configuration"""
    id: str
    tenant_id: str
    url: str
    events: List[str]  # Event types to receive, or ["*"] for all
    secret: Optional[str] = None  # For HMAC signing
    status: str = "active"


# ============== Webhook Service ==============

class WebhookService:
    """
    Service for managing and delivering webhooks.
    """
    
    def __init__(self):
        # Retry configuration
        self.max_retries = 5
        self.retry_delays = [60, 300, 900, 3600, 7200]  # Seconds: 1m, 5m, 15m, 1h, 2h
        
        # HTTP client
        self.timeout = 30.0
        
        # In-memory queue for async delivery
        self._queue: asyncio.Queue = None
        self._worker_task: asyncio.Task = None
        
        # Delivery logs (in-memory, for recent history)
        self._delivery_logs: List[WebhookDelivery] = []
        self._max_logs = 1000
    
    async def start(self):
        """Start the webhook delivery worker"""
        self._queue = asyncio.Queue()
        self._worker_task = asyncio.create_task(self._delivery_worker())
    
    async def stop(self):
        """Stop the webhook delivery worker"""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
    
    def _generate_signature(self, payload: str, secret: str) -> str:
        """Generate HMAC-SHA256 signature for webhook payload"""
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    async def create_webhook(self, tenant_id: str, url: str, events: List[str],
                            secret: str = None, name: str = None) -> WebhookConfig:
        """Create a new webhook"""
        webhook_id = str(uuid.uuid4())
        secret = secret or f"whsec_{uuid.uuid4().hex}"
        
        await db.create_webhook({
            "id": webhook_id,
            "tenant_id": tenant_id,
            "url": url,
            "events": events,
            "secret_hash": hashlib.sha256(secret.encode()).hexdigest() if secret else None,
            "status": "active"
        })
        
        return WebhookConfig(
            id=webhook_id,
            tenant_id=tenant_id,
            url=url,
            events=events,
            secret=secret  # Return secret only on creation
        )
    
    async def list_webhooks(self, tenant_id: str) -> List[Dict[str, Any]]:
        """List webhooks for a tenant"""
        return await db.list_webhooks(tenant_id)
    
    async def delete_webhook(self, webhook_id: str) -> bool:
        """Delete a webhook"""
        # In a real implementation, update status to 'deleted'
        return True
    
    async def emit(self, tenant_id: str, event: WebhookEvent, data: Dict[str, Any]):
        """
        Emit a webhook event.
        Queues delivery to all matching webhooks.
        """
        # Get webhooks that should receive this event
        webhooks = await db.get_webhooks_for_event(tenant_id, event.value)
        
        if not webhooks:
            return
        
        # Create payload
        event_id = str(uuid.uuid4())
        payload = WebhookPayload(
            id=event_id,
            event=event.value,
            created_at=datetime.now(timezone.utc),
            tenant_id=tenant_id,
            data=data,
            idempotency_key=f"{event_id}:{event.value}"
        )
        
        # Queue delivery to each webhook
        for webhook in webhooks:
            if self._queue:
                await self._queue.put({
                    "webhook": webhook,
                    "payload": payload,
                    "attempt": 1
                })
    
    async def _delivery_worker(self):
        """Background worker for webhook delivery"""
        while True:
            try:
                item = await self._queue.get()
                await self._deliver(
                    item["webhook"],
                    item["payload"],
                    item["attempt"]
                )
                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Webhook delivery error: {e}")
    
    async def _deliver(self, webhook: Dict[str, Any], payload: WebhookPayload,
                      attempt: int = 1):
        """Deliver a webhook payload"""
        payload_json = payload.model_dump_json()
        delivery_id = str(uuid.uuid4())
        start_time = datetime.now(timezone.utc)
        
        # Build headers
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-ID": webhook["id"],
            "X-Event-ID": payload.id,
            "X-Event-Type": payload.event,
            "X-Delivery-Attempt": str(attempt)
        }
        
        # Add signature if secret exists
        if webhook.get("secret_hash"):
            # In production, we'd need to store the actual secret securely
            # For now, use the hash as a placeholder
            timestamp = str(int(datetime.now(timezone.utc).timestamp()))
            signature_payload = f"{timestamp}.{payload_json}"
            signature = self._generate_signature(signature_payload, webhook["secret_hash"][:32])
            headers["X-Signature"] = f"t={timestamp},v1={signature}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook["url"],
                    content=payload_json,
                    headers=headers,
                    timeout=self.timeout
                )
                
                if response.status_code >= 200 and response.status_code < 300:
                    # Success - log it
                    self._log_delivery(WebhookDelivery(
                        id=delivery_id,
                        webhook_id=webhook["id"],
                        event_id=payload.id,
                        status=DeliveryStatus.SUCCESS,
                        attempts=attempt,
                        last_attempt_at=start_time,
                        response_code=response.status_code,
                        response_body=response.text[:500] if response.text else None,
                        error=None,
                        next_retry_at=None
                    ))
                    print(f"Webhook delivered: {webhook['id']} -> {payload.event}")
                else:
                    # Failure - log and retry if attempts remaining
                    self._log_delivery(WebhookDelivery(
                        id=delivery_id,
                        webhook_id=webhook["id"],
                        event_id=payload.id,
                        status=DeliveryStatus.RETRYING if attempt < self.max_retries else DeliveryStatus.FAILED,
                        attempts=attempt,
                        last_attempt_at=start_time,
                        response_code=response.status_code,
                        response_body=response.text[:500] if response.text else None,
                        error=f"HTTP {response.status_code}",
                        next_retry_at=None
                    ))
                    await self._handle_failure(
                        webhook, payload, attempt,
                        f"HTTP {response.status_code}"
                    )
                    
        except Exception as e:
            # Log failure
            self._log_delivery(WebhookDelivery(
                id=delivery_id,
                webhook_id=webhook["id"],
                event_id=payload.id,
                status=DeliveryStatus.RETRYING if attempt < self.max_retries else DeliveryStatus.FAILED,
                attempts=attempt,
                last_attempt_at=start_time,
                response_code=None,
                response_body=None,
                error=str(e),
                next_retry_at=None
            ))
            await self._handle_failure(webhook, payload, attempt, str(e))
    
    def _log_delivery(self, delivery: WebhookDelivery):
        """Log a delivery attempt"""
        self._delivery_logs.append(delivery)
        # Keep only recent logs
        if len(self._delivery_logs) > self._max_logs:
            self._delivery_logs = self._delivery_logs[-self._max_logs:]
    
    def get_delivery_logs(self, webhook_id: str = None, limit: int = 100) -> List[WebhookDelivery]:
        """Get delivery logs, optionally filtered by webhook ID"""
        logs = self._delivery_logs
        if webhook_id:
            logs = [l for l in logs if l.webhook_id == webhook_id]
        return sorted(logs, key=lambda l: l.last_attempt_at or datetime.min, reverse=True)[:limit]
    
    def get_delivery_stats(self, webhook_id: str = None) -> Dict[str, Any]:
        """Get delivery statistics"""
        logs = self._delivery_logs
        if webhook_id:
            logs = [l for l in logs if l.webhook_id == webhook_id]
        
        total = len(logs)
        success = len([l for l in logs if l.status == DeliveryStatus.SUCCESS])
        failed = len([l for l in logs if l.status == DeliveryStatus.FAILED])
        retrying = len([l for l in logs if l.status == DeliveryStatus.RETRYING])
        
        return {
            "total": total,
            "success": success,
            "failed": failed,
            "retrying": retrying,
            "success_rate": round(success / total * 100, 2) if total > 0 else 100.0
        }
    
    async def _handle_failure(self, webhook: Dict[str, Any], payload: WebhookPayload,
                             attempt: int, error: str):
        """Handle delivery failure"""
        print(f"Webhook delivery failed: {webhook['id']} attempt {attempt}: {error}")
        
        if attempt < self.max_retries:
            # Schedule retry
            delay = self.retry_delays[min(attempt - 1, len(self.retry_delays) - 1)]
            await asyncio.sleep(delay)
            
            if self._queue:
                await self._queue.put({
                    "webhook": webhook,
                    "payload": payload,
                    "attempt": attempt + 1
                })
    
    # ============== Helper methods for common events ==============
    
    async def emit_consent_issued(self, tenant_id: str, token_id: str,
                                  subject_id: str, purposes: List[str],
                                  vendors: List[str], expires_at: datetime):
        """Emit consent.issued event"""
        await self.emit(tenant_id, WebhookEvent.CONSENT_ISSUED, {
            "token_id": token_id,
            "subject_id": subject_id,
            "purposes": purposes,
            "vendors": vendors,
            "expires_at": expires_at.isoformat()
        })
    
    async def emit_consent_revoked(self, tenant_id: str, token_id: str,
                                   subject_id: str, reason: str):
        """Emit consent.revoked event"""
        await self.emit(tenant_id, WebhookEvent.CONSENT_REVOKED, {
            "token_id": token_id,
            "subject_id": subject_id,
            "reason": reason
        })
    
    async def emit_enforcement_decision(self, tenant_id: str, event_id: str,
                                        vendor: str, decision: str, reason: str,
                                        forwarded: bool):
        """Emit enforcement decision event"""
        event_map = {
            "allowed": WebhookEvent.ENFORCEMENT_ALLOWED,
            "modified": WebhookEvent.ENFORCEMENT_MODIFIED,
            "blocked": WebhookEvent.ENFORCEMENT_BLOCKED,
        }
        event_type = event_map.get(decision, WebhookEvent.ENFORCEMENT_BLOCKED)
        
        await self.emit(tenant_id, event_type, {
            "event_id": event_id,
            "vendor": vendor,
            "decision": decision,
            "reason": reason,
            "forwarded": forwarded
        })


# Singleton instance
webhook_service = WebhookService()
