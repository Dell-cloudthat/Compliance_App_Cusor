"""
Webhook handler for verifying and processing incoming webhooks
"""

import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Callable, List
from .models import WebhookEvent
from .exceptions import WebhookVerificationError


class WebhookHandler:
    """
    Handler for processing incoming webhooks from the Consent Platform.
    
    Example:
        handler = WebhookHandler(secret="whsec_xxxxx")
        
        # In your Flask/FastAPI route:
        @app.post("/webhooks")
        def handle_webhook(request):
            payload = request.get_data()
            signature = request.headers.get("X-Signature")
            
            try:
                event = handler.verify_and_parse(payload, signature)
                
                if event.event == "consent.issued":
                    handle_consent_issued(event.data)
                elif event.event == "enforcement.blocked":
                    handle_blocked_event(event.data)
                    
                return {"received": True}
            except WebhookVerificationError:
                return {"error": "Invalid signature"}, 401
    """
    
    def __init__(
        self,
        secret: str,
        tolerance: int = 300,  # 5 minutes
    ):
        """
        Initialize the webhook handler.
        
        Args:
            secret: Webhook signing secret
            tolerance: Maximum age of webhook in seconds (default: 300)
        """
        self.secret = secret
        self.tolerance = tolerance
        self._handlers: Dict[str, List[Callable]] = {}
    
    def verify_signature(
        self,
        payload: bytes,
        signature_header: str,
    ) -> bool:
        """
        Verify the webhook signature.
        
        Args:
            payload: Raw request body
            signature_header: X-Signature header value
        
        Returns:
            True if signature is valid
        
        Raises:
            WebhookVerificationError if verification fails
        """
        if not signature_header:
            raise WebhookVerificationError("Missing signature header")
        
        # Parse signature header: t=timestamp,v1=signature
        parts = {}
        for part in signature_header.split(","):
            if "=" in part:
                key, value = part.split("=", 1)
                parts[key] = value
        
        timestamp = parts.get("t")
        signature = parts.get("v1")
        
        if not timestamp or not signature:
            raise WebhookVerificationError("Invalid signature format")
        
        # Check timestamp tolerance
        try:
            webhook_time = int(timestamp)
            current_time = int(datetime.now(timezone.utc).timestamp())
            
            if abs(current_time - webhook_time) > self.tolerance:
                raise WebhookVerificationError("Webhook timestamp too old")
        except ValueError:
            raise WebhookVerificationError("Invalid timestamp")
        
        # Compute expected signature
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        expected_signature = hmac.new(
            self.secret.encode(),
            signed_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures
        if not hmac.compare_digest(signature, expected_signature):
            raise WebhookVerificationError("Signature mismatch")
        
        return True
    
    def parse(self, payload: bytes) -> WebhookEvent:
        """
        Parse webhook payload into a WebhookEvent.
        
        Args:
            payload: Raw request body
        
        Returns:
            WebhookEvent object
        """
        try:
            data = json.loads(payload)
            return WebhookEvent(
                id=data["id"],
                event=data["event"],
                created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                tenant_id=data["tenant_id"],
                data=data["data"],
                idempotency_key=data["idempotency_key"],
            )
        except (json.JSONDecodeError, KeyError) as e:
            raise WebhookVerificationError(f"Invalid payload: {e}")
    
    def verify_and_parse(
        self,
        payload: bytes,
        signature_header: str,
    ) -> WebhookEvent:
        """
        Verify signature and parse the webhook.
        
        Args:
            payload: Raw request body
            signature_header: X-Signature header value
        
        Returns:
            WebhookEvent object
        
        Raises:
            WebhookVerificationError if verification fails
        """
        self.verify_signature(payload, signature_header)
        return self.parse(payload)
    
    def on(self, event_type: str, handler: Callable[[WebhookEvent], None]):
        """
        Register a handler for a specific event type.
        
        Args:
            event_type: Event type (e.g., "consent.issued")
            handler: Callback function
        
        Example:
            @webhook_handler.on("consent.issued")
            def handle_consent(event):
                print(f"Consent issued: {event.data}")
        """
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        return handler  # Allow use as decorator
    
    def handle(self, event: WebhookEvent):
        """
        Dispatch an event to registered handlers.
        
        Args:
            event: The WebhookEvent to handle
        """
        handlers = self._handlers.get(event.event, [])
        handlers.extend(self._handlers.get("*", []))  # Wildcard handlers
        
        for handler in handlers:
            handler(event)
    
    def process(
        self,
        payload: bytes,
        signature_header: str,
    ) -> WebhookEvent:
        """
        Verify, parse, and handle a webhook in one call.
        
        Args:
            payload: Raw request body
            signature_header: X-Signature header value
        
        Returns:
            The processed WebhookEvent
        """
        event = self.verify_and_parse(payload, signature_header)
        self.handle(event)
        return event


# Flask integration helper
def flask_webhook_handler(handler: WebhookHandler):
    """
    Create a Flask route handler for webhooks.
    
    Example:
        from flask import Flask
        from consent_platform import WebhookHandler, flask_webhook_handler
        
        app = Flask(__name__)
        webhook = WebhookHandler(secret="whsec_xxxxx")
        
        @webhook.on("consent.issued")
        def on_consent(event):
            print(f"New consent: {event.data}")
        
        app.add_url_rule(
            "/webhooks",
            "webhooks",
            flask_webhook_handler(webhook),
            methods=["POST"]
        )
    """
    def route_handler():
        from flask import request, jsonify
        
        try:
            event = handler.process(
                request.get_data(),
                request.headers.get("X-Signature", "")
            )
            return jsonify({"received": True, "event_id": event.id})
        except WebhookVerificationError as e:
            return jsonify({"error": str(e)}), 401
    
    return route_handler


# FastAPI integration helper
def fastapi_webhook_handler(handler: WebhookHandler):
    """
    Create a FastAPI route handler for webhooks.
    
    Example:
        from fastapi import FastAPI, Request
        from consent_platform import WebhookHandler, fastapi_webhook_handler
        
        app = FastAPI()
        webhook = WebhookHandler(secret="whsec_xxxxx")
        
        @webhook.on("consent.issued")
        def on_consent(event):
            print(f"New consent: {event.data}")
        
        app.post("/webhooks")(fastapi_webhook_handler(webhook))
    """
    async def route_handler(request):
        from fastapi import HTTPException
        from fastapi.responses import JSONResponse
        
        body = await request.body()
        signature = request.headers.get("X-Signature", "")
        
        try:
            event = handler.process(body, signature)
            return JSONResponse({"received": True, "event_id": event.id})
        except WebhookVerificationError as e:
            raise HTTPException(status_code=401, detail=str(e))
    
    return route_handler
