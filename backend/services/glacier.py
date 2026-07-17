"""
AWS Glacier / S3 Archive Service
=================================
Handles long-term retention for violation evidence records beyond the
default 30-day hot tier.

Billing model
-------------
• Hot tier (SQLite, 0-30 days):  included in base platform plan
• Glacier tier (30+ days):       billed at AWS Glacier rates passed through
  to the tenant — approximately $0.004/GB/month (Glacier Instant Retrieval)
  or $0.0018/GB/month (Glacier Deep Archive for 7-year regulatory holds).

Architecture
------------
Records are serialised as newline-delimited JSON and uploaded to:
  s3://{GLACIER_BUCKET}/{tenant_user_id}/{year}/{month}/{violation_id}.json

We use S3 with the GLACIER storage class rather than the raw Glacier API,
which gives standard S3 semantics with Glacier pricing.

Environment variables required
-------------------------------
GLACIER_BUCKET           S3 bucket name  (required for real archive)
AWS_ACCESS_KEY_ID        AWS credentials (or use instance role / env chain)
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION       defaults to us-east-1
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

logger = logging.getLogger(__name__)

GLACIER_BUCKET  = os.getenv("GLACIER_BUCKET", "")
AWS_REGION      = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
STORAGE_CLASS   = "GLACIER"          # Glacier Flexible Retrieval (cheapest)
# Swap to "GLACIER_IR" for Instant Retrieval (higher cost, faster access)


def _boto3_client():
    """Return an S3 client. Raises ImportError if boto3 not installed."""
    import boto3  # noqa: F401 — optional dependency
    return boto3.client("s3", region_name=AWS_REGION)


def archive_violation(user_id: int, record: Dict[str, Any]) -> str:
    """
    Serialise a violation_sources row and upload it to S3/Glacier.

    Returns the S3 object key (stored as glacier_key in SQLite).
    If GLACIER_BUCKET is not set or boto3 is unavailable, logs a warning
    and returns a synthetic key so the rest of the flow still works in dev.
    """
    now = datetime.now(timezone.utc)
    year, month = now.strftime("%Y"), now.strftime("%m")
    vid = record.get("id", "unknown")
    key = f"violations/{user_id}/{year}/{month}/{vid}.json"

    payload = json.dumps(
        {
            "schema_version": "1.0",
            "archived_at":    now.isoformat(),
            "tenant_user_id": user_id,
            "record":         record,
        },
        default=str,
    ).encode("utf-8")

    if not GLACIER_BUCKET:
        logger.warning(
            "GLACIER_BUCKET env var not set — violation %s not uploaded to S3. "
            "Set GLACIER_BUCKET to enable real archiving.",
            vid,
        )
        return f"local-stub/{key}"

    try:
        s3 = _boto3_client()
        s3.put_object(
            Bucket=GLACIER_BUCKET,
            Key=key,
            Body=payload,
            ContentType="application/json",
            StorageClass=STORAGE_CLASS,
            Metadata={
                "tenant-user-id": str(user_id),
                "control-id":     str(record.get("control_id", "")),
                "violation-type": str(record.get("violation_type", "")),
                "source-vendor":  str(record.get("source_vendor", "")),
                "entity-type":    str(record.get("entity_type", "")),
                "archived-at":    now.isoformat(),
            },
        )
        logger.info("Archived violation %s → s3://%s/%s", vid, GLACIER_BUCKET, key)
        return key

    except ImportError:
        logger.warning("boto3 not installed — falling back to local-stub key for violation %s", vid)
        return f"local-stub/{key}"
    except Exception as exc:
        logger.error("Failed to archive violation %s to Glacier: %s", vid, exc)
        raise RuntimeError(f"Glacier upload failed: {exc}") from exc


def estimate_cost(records_count: int, avg_bytes: int = 512) -> Dict[str, Any]:
    """
    Rough cost estimate for archiving a set of records.
    Uses AWS Glacier Flexible Retrieval pricing (us-east-1, 2024 rates).
    """
    total_bytes  = records_count * avg_bytes
    total_gb     = total_bytes / (1024 ** 3)
    monthly_cost = round(total_gb * 0.004, 4)   # $0.004/GB/month Glacier Flexible
    annual_cost  = round(monthly_cost * 12, 4)

    return {
        "records":         records_count,
        "estimated_gb":    round(total_gb, 6),
        "storage_class":   STORAGE_CLASS,
        "monthly_usd":     monthly_cost,
        "annual_usd":      annual_cost,
        "pricing_note":    "Glacier Flexible Retrieval (us-east-1). "
                           "Retrieval fees apply when records are restored. "
                           "Switch to GLACIER_IR for instant access at ~$0.023/GB/month.",
    }


def restore_from_glacier(glacier_key: str) -> Dict[str, Any]:
    """
    Initiate a Glacier restore (Expedited tier, 1-5 min for Instant Retrieval
    or 3-5 hours for Flexible Retrieval).
    Returns restoration status.
    """
    if not GLACIER_BUCKET or glacier_key.startswith("local-stub/"):
        return {"status": "stub", "detail": "No real Glacier configured (GLACIER_BUCKET not set)."}

    try:
        s3 = _boto3_client()
        s3.restore_object(
            Bucket=GLACIER_BUCKET,
            Key=glacier_key,
            RestoreRequest={"Days": 7, "GlacierJobParameters": {"Tier": "Expedited"}},
        )
        return {"status": "initiated", "key": glacier_key, "available_in": "1-5 minutes"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}
