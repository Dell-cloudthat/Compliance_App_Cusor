"""
Prometheus Metrics Service

Exposes key platform metrics in Prometheus format.

Key Metrics:
- Requests per second
- Enforcement decisions (allowed/modified/blocked)
- Token issuance rate
- Latency histograms
- Error rates
- Vendor trust scores
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional
from collections import defaultdict
import time
import threading


class Counter:
    """Thread-safe counter"""
    def __init__(self, name: str, description: str, labels: list = None):
        self.name = name
        self.description = description
        self.labels = labels or []
        self._values: Dict[tuple, float] = defaultdict(float)
        self._lock = threading.Lock()
    
    def inc(self, value: float = 1, **label_values):
        key = tuple(label_values.get(l, "") for l in self.labels)
        with self._lock:
            self._values[key] += value
    
    def get(self, **label_values) -> float:
        key = tuple(label_values.get(l, "") for l in self.labels)
        return self._values.get(key, 0)
    
    def to_prometheus(self) -> str:
        lines = [
            f"# HELP {self.name} {self.description}",
            f"# TYPE {self.name} counter"
        ]
        for key, value in self._values.items():
            if self.labels:
                label_str = ",".join(f'{l}="{v}"' for l, v in zip(self.labels, key))
                lines.append(f"{self.name}{{{label_str}}} {value}")
            else:
                lines.append(f"{self.name} {value}")
        return "\n".join(lines)


class Gauge:
    """Thread-safe gauge"""
    def __init__(self, name: str, description: str, labels: list = None):
        self.name = name
        self.description = description
        self.labels = labels or []
        self._values: Dict[tuple, float] = {}
        self._lock = threading.Lock()
    
    def set(self, value: float, **label_values):
        key = tuple(label_values.get(l, "") for l in self.labels)
        with self._lock:
            self._values[key] = value
    
    def inc(self, value: float = 1, **label_values):
        key = tuple(label_values.get(l, "") for l in self.labels)
        with self._lock:
            self._values[key] = self._values.get(key, 0) + value
    
    def dec(self, value: float = 1, **label_values):
        key = tuple(label_values.get(l, "") for l in self.labels)
        with self._lock:
            self._values[key] = self._values.get(key, 0) - value
    
    def get(self, **label_values) -> float:
        key = tuple(label_values.get(l, "") for l in self.labels)
        return self._values.get(key, 0)
    
    def to_prometheus(self) -> str:
        lines = [
            f"# HELP {self.name} {self.description}",
            f"# TYPE {self.name} gauge"
        ]
        for key, value in self._values.items():
            if self.labels:
                label_str = ",".join(f'{l}="{v}"' for l, v in zip(self.labels, key))
                lines.append(f"{self.name}{{{label_str}}} {value}")
            else:
                lines.append(f"{self.name} {value}")
        return "\n".join(lines)


class Histogram:
    """Thread-safe histogram with predefined buckets"""
    def __init__(self, name: str, description: str, buckets: list = None, labels: list = None):
        self.name = name
        self.description = description
        self.labels = labels or []
        self.buckets = buckets or [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
        self._counts: Dict[tuple, Dict[float, int]] = defaultdict(lambda: defaultdict(int))
        self._sums: Dict[tuple, float] = defaultdict(float)
        self._totals: Dict[tuple, int] = defaultdict(int)
        self._lock = threading.Lock()
    
    def observe(self, value: float, **label_values):
        key = tuple(label_values.get(l, "") for l in self.labels)
        with self._lock:
            self._sums[key] += value
            self._totals[key] += 1
            for bucket in self.buckets:
                if value <= bucket:
                    self._counts[key][bucket] += 1
            self._counts[key][float('inf')] += 1  # +Inf bucket
    
    def to_prometheus(self) -> str:
        lines = [
            f"# HELP {self.name} {self.description}",
            f"# TYPE {self.name} histogram"
        ]
        for key in set(list(self._counts.keys()) + list(self._sums.keys())):
            label_str = ""
            if self.labels:
                label_str = ",".join(f'{l}="{v}"' for l, v in zip(self.labels, key))
            
            # Cumulative bucket counts
            cumulative = 0
            for bucket in self.buckets:
                cumulative += self._counts[key].get(bucket, 0)
                if label_str:
                    lines.append(f'{self.name}_bucket{{{label_str},le="{bucket}"}} {cumulative}')
                else:
                    lines.append(f'{self.name}_bucket{{le="{bucket}"}} {cumulative}')
            
            # +Inf bucket
            cumulative += self._counts[key].get(float('inf'), 0) - cumulative
            if label_str:
                lines.append(f'{self.name}_bucket{{{label_str},le="+Inf"}} {self._totals[key]}')
                lines.append(f'{self.name}_sum{{{label_str}}} {self._sums[key]}')
                lines.append(f'{self.name}_count{{{label_str}}} {self._totals[key]}')
            else:
                lines.append(f'{self.name}_bucket{{le="+Inf"}} {self._totals[key]}')
                lines.append(f'{self.name}_sum {self._sums[key]}')
                lines.append(f'{self.name}_count {self._totals[key]}')
        
        return "\n".join(lines)


class MetricsService:
    """
    Central metrics collection service.
    
    Exposes Prometheus-compatible metrics at /metrics endpoint.
    """
    
    def __init__(self):
        # Request metrics
        self.requests_total = Counter(
            "consent_platform_requests_total",
            "Total number of HTTP requests",
            labels=["method", "endpoint", "status"]
        )
        
        self.request_duration = Histogram(
            "consent_platform_request_duration_seconds",
            "HTTP request duration in seconds",
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
            labels=["method", "endpoint"]
        )
        
        # Consent metrics
        self.tokens_issued_total = Counter(
            "consent_platform_tokens_issued_total",
            "Total number of consent tokens issued",
            labels=["tenant_id", "jurisdiction"]
        )
        
        self.tokens_revoked_total = Counter(
            "consent_platform_tokens_revoked_total",
            "Total number of consent tokens revoked",
            labels=["tenant_id", "reason"]
        )
        
        self.active_tokens = Gauge(
            "consent_platform_active_tokens",
            "Number of currently active consent tokens",
            labels=["tenant_id"]
        )
        
        # Enforcement metrics
        self.enforcement_decisions_total = Counter(
            "consent_platform_enforcement_decisions_total",
            "Total number of enforcement decisions",
            labels=["tenant_id", "vendor", "decision"]
        )
        
        self.enforcement_duration = Histogram(
            "consent_platform_enforcement_duration_seconds",
            "Enforcement decision duration in seconds",
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
            labels=["vendor"]
        )
        
        self.events_forwarded_total = Counter(
            "consent_platform_events_forwarded_total",
            "Total number of events forwarded to vendors",
            labels=["vendor", "status"]
        )
        
        # Vendor metrics
        self.vendor_trust_score = Gauge(
            "consent_platform_vendor_trust_score",
            "Current trust score for vendor",
            labels=["vendor_id", "vendor_name"]
        )
        
        self.vendor_compliance_rate = Gauge(
            "consent_platform_vendor_compliance_rate",
            "Compliance rate for vendor",
            labels=["vendor_id"]
        )
        
        self.vendor_violations_total = Counter(
            "consent_platform_vendor_violations_total",
            "Total number of vendor violations",
            labels=["vendor_id", "severity"]
        )
        
        # Evidence store metrics
        self.evidence_events_total = Counter(
            "consent_platform_evidence_events_total",
            "Total number of events in evidence store",
            labels=["tenant_id", "event_type"]
        )
        
        self.evidence_chain_valid = Gauge(
            "consent_platform_evidence_chain_valid",
            "Whether the evidence chain is valid (1=valid, 0=invalid)",
            labels=["tenant_id"]
        )
        
        # Webhook metrics
        self.webhooks_delivered_total = Counter(
            "consent_platform_webhooks_delivered_total",
            "Total number of webhooks delivered",
            labels=["tenant_id", "event", "status"]
        )
        
        self.webhook_delivery_duration = Histogram(
            "consent_platform_webhook_delivery_duration_seconds",
            "Webhook delivery duration in seconds",
            buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
            labels=["tenant_id"]
        )
        
        # API key metrics
        self.api_key_usage_total = Counter(
            "consent_platform_api_key_usage_total",
            "Total number of API key usages",
            labels=["tenant_id", "key_name"]
        )
        
        # Rate limiting metrics
        self.rate_limit_exceeded_total = Counter(
            "consent_platform_rate_limit_exceeded_total",
            "Total number of rate limit exceeded events",
            labels=["tenant_id", "tier"]
        )
        
        # System metrics
        self.uptime_seconds = Gauge(
            "consent_platform_uptime_seconds",
            "Time since service started in seconds"
        )
        
        self.info = Gauge(
            "consent_platform_info",
            "Platform information",
            labels=["version"]
        )
        
        # Initialize
        self._start_time = time.time()
        self.info.set(1, version="1.0.0")
    
    # ==================== Recording Methods ====================
    
    def record_request(self, method: str, endpoint: str, status: int, duration: float):
        """Record an HTTP request"""
        self.requests_total.inc(method=method, endpoint=endpoint, status=str(status))
        self.request_duration.observe(duration, method=method, endpoint=endpoint)
    
    def record_token_issued(self, tenant_id: str, jurisdiction: str):
        """Record a token issuance"""
        self.tokens_issued_total.inc(tenant_id=tenant_id, jurisdiction=jurisdiction)
        self.active_tokens.inc(tenant_id=tenant_id)
    
    def record_token_revoked(self, tenant_id: str, reason: str):
        """Record a token revocation"""
        self.tokens_revoked_total.inc(tenant_id=tenant_id, reason=reason)
        self.active_tokens.dec(tenant_id=tenant_id)
    
    def record_enforcement(self, tenant_id: str, vendor: str, decision: str, duration_ms: float):
        """Record an enforcement decision"""
        self.enforcement_decisions_total.inc(tenant_id=tenant_id, vendor=vendor, decision=decision)
        self.enforcement_duration.observe(duration_ms / 1000, vendor=vendor)
    
    def record_event_forwarded(self, vendor: str, success: bool):
        """Record event forwarding"""
        status = "success" if success else "failed"
        self.events_forwarded_total.inc(vendor=vendor, status=status)
    
    def record_vendor_metrics(self, vendor_id: str, vendor_name: str, trust_score: float, compliance_rate: float):
        """Update vendor metrics"""
        self.vendor_trust_score.set(trust_score, vendor_id=vendor_id, vendor_name=vendor_name)
        self.vendor_compliance_rate.set(compliance_rate, vendor_id=vendor_id)
    
    def record_vendor_violation(self, vendor_id: str, severity: str):
        """Record a vendor violation"""
        self.vendor_violations_total.inc(vendor_id=vendor_id, severity=severity)
    
    def record_evidence_event(self, tenant_id: str, event_type: str):
        """Record evidence store event"""
        self.evidence_events_total.inc(tenant_id=tenant_id, event_type=event_type)
    
    def record_webhook_delivery(self, tenant_id: str, event: str, success: bool, duration: float):
        """Record webhook delivery"""
        status = "success" if success else "failed"
        self.webhooks_delivered_total.inc(tenant_id=tenant_id, event=event, status=status)
        self.webhook_delivery_duration.observe(duration, tenant_id=tenant_id)
    
    def record_api_key_usage(self, tenant_id: str, key_name: str):
        """Record API key usage"""
        self.api_key_usage_total.inc(tenant_id=tenant_id, key_name=key_name)
    
    def record_rate_limit_exceeded(self, tenant_id: str, tier: str):
        """Record rate limit exceeded"""
        self.rate_limit_exceeded_total.inc(tenant_id=tenant_id, tier=tier)
    
    # ==================== Export ====================
    
    def export_prometheus(self) -> str:
        """Export all metrics in Prometheus format"""
        # Update uptime
        self.uptime_seconds.set(time.time() - self._start_time)
        
        metrics = [
            self.requests_total,
            self.request_duration,
            self.tokens_issued_total,
            self.tokens_revoked_total,
            self.active_tokens,
            self.enforcement_decisions_total,
            self.enforcement_duration,
            self.events_forwarded_total,
            self.vendor_trust_score,
            self.vendor_compliance_rate,
            self.vendor_violations_total,
            self.evidence_events_total,
            self.evidence_chain_valid,
            self.webhooks_delivered_total,
            self.webhook_delivery_duration,
            self.api_key_usage_total,
            self.rate_limit_exceeded_total,
            self.uptime_seconds,
            self.info,
        ]
        
        output = []
        for metric in metrics:
            prometheus_str = metric.to_prometheus()
            if prometheus_str.strip():
                output.append(prometheus_str)
        
        return "\n\n".join(output) + "\n"
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of key metrics"""
        return {
            "uptime_seconds": time.time() - self._start_time,
            "requests": {
                "total": sum(self.requests_total._values.values()),
            },
            "tokens": {
                "issued_total": sum(self.tokens_issued_total._values.values()),
                "revoked_total": sum(self.tokens_revoked_total._values.values()),
            },
            "enforcement": {
                "decisions_total": sum(self.enforcement_decisions_total._values.values()),
            },
            "webhooks": {
                "delivered_total": sum(self.webhooks_delivered_total._values.values()),
            }
        }


# Singleton instance
metrics = MetricsService()
