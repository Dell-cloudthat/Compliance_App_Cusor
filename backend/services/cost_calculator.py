"""
Cost Calculator Service - Predicts backend costs based on usage
"""

from typing import Dict, Any
from datetime import datetime, timedelta

class CostCalculator:
    """Service for calculating and predicting backend costs"""
    
    # Pricing constants (can be configured per environment)
    PRICING = {
        'auth': {
            'cost_per_user_monthly': 0.0055,  # $0.0055 per user/month
            'description': 'Authentication service cost'
        },
        'storage': {
            's3_standard_per_gb': 0.023,  # $0.023/GB/month (S3 Standard)
            's3_glacier_per_gb': 0.004,  # $0.004/GB/month (Glacier for archival)
            'description': 'Storage cost (S3 Standard for active, Glacier for archival)'
        },
        'api_requests': {
            'cost_per_request': 0.0001,  # $0.0001 per API request
            'free_tier': 10000,  # First 10k requests free
            'description': 'API request cost'
        },
        'compute': {
            'base_monthly': 10.0,  # Base compute cost
            'per_1000_requests': 0.01,  # Additional compute per 1000 requests
            'description': 'Compute/processing cost'
        },
        'database': {
            'base_monthly': 5.0,  # Base database cost (SQLite hosted or small RDS)
            'per_gb_storage': 0.115,  # $0.115/GB/month for database storage
            'description': 'Database hosting cost'
        }
    }
    
    @staticmethod
    def calculate_monthly_cost(
        num_users: int,
        storage_gb: float,
        api_requests: int,
        retention_days: int = 90
    ) -> Dict[str, Any]:
        """
        Calculate monthly costs based on usage metrics
        
        Args:
            num_users: Number of active users
            storage_gb: Total storage in GB
            api_requests: Number of API requests per month
            retention_days: Data retention period in days
        
        Returns:
            cost_breakdown: Detailed cost breakdown
        """
        pricing = CostCalculator.PRICING
        
        # Authentication cost
        auth_cost = num_users * pricing['auth']['cost_per_user_monthly']
        
        # Storage cost (S3 Standard for active data, Glacier for archival)
        # Assume 30 days active, rest in Glacier
        active_days = min(30, retention_days)
        archival_days = max(0, retention_days - 30)
        
        active_storage_gb = storage_gb * (active_days / retention_days) if retention_days > 0 else 0
        archival_storage_gb = storage_gb * (archival_days / retention_days) if retention_days > 0 else 0
        
        storage_cost = (
            active_storage_gb * pricing['storage']['s3_standard_per_gb'] +
            archival_storage_gb * pricing['storage']['s3_glacier_per_gb']
        )
        
        # API request cost (with free tier)
        billable_requests = max(0, api_requests - pricing['api_requests']['free_tier'])
        api_cost = billable_requests * pricing['api_requests']['cost_per_request']
        
        # Compute cost
        compute_cost = (
            pricing['compute']['base_monthly'] +
            (api_requests / 1000) * pricing['compute']['per_1000_requests']
        )
        
        # Database cost
        db_cost = (
            pricing['database']['base_monthly'] +
            storage_gb * 0.1 * pricing['database']['per_gb_storage']  # Assume 10% of storage is DB
        )
        
        # Total monthly cost
        total_monthly = auth_cost + storage_cost + api_cost + compute_cost + db_cost
        
        # Annual projection
        annual_cost = total_monthly * 12
        
        # Per-user breakdown
        cost_per_user_monthly = total_monthly / num_users if num_users > 0 else 0
        
        return {
            'monthly': {
                'auth': round(auth_cost, 2),
                'storage': {
                    'active_s3': round(active_storage_gb * pricing['storage']['s3_standard_per_gb'], 2),
                    'archival_glacier': round(archival_storage_gb * pricing['storage']['s3_glacier_per_gb'], 2),
                    'total': round(storage_cost, 2)
                },
                'api_requests': round(api_cost, 2),
                'compute': round(compute_cost, 2),
                'database': round(db_cost, 2),
                'total': round(total_monthly, 2)
            },
            'annual': round(annual_cost, 2),
            'per_user_monthly': round(cost_per_user_monthly, 2),
            'metrics': {
                'users': num_users,
                'storage_gb': round(storage_gb, 2),
                'active_storage_gb': round(active_storage_gb, 2),
                'archival_storage_gb': round(archival_storage_gb, 2),
                'api_requests': api_requests,
                'billable_requests': billable_requests,
                'retention_days': retention_days
            },
            'breakdown': {
                'auth_percentage': round((auth_cost / total_monthly * 100), 1) if total_monthly > 0 else 0,
                'storage_percentage': round((storage_cost / total_monthly * 100), 1) if total_monthly > 0 else 0,
                'api_percentage': round((api_cost / total_monthly * 100), 1) if total_monthly > 0 else 0,
                'compute_percentage': round((compute_cost / total_monthly * 100), 1) if total_monthly > 0 else 0,
                'database_percentage': round((db_cost / total_monthly * 100), 1) if total_monthly > 0 else 0
            },
            'pricing_details': pricing
        }
    
    @staticmethod
    def estimate_storage_for_users(
        num_users: int,
        avg_segments_per_user: int = 10,
        avg_segment_size_mb: float = 0.5
    ) -> float:
        """
        Estimate total storage needed based on user count
        
        Returns:
            storage_gb: Estimated storage in GB
        """
        total_segments = num_users * avg_segments_per_user
        total_storage_mb = total_segments * avg_segment_size_mb
        storage_gb = total_storage_mb / 1024
        return round(storage_gb, 2)
    
    @staticmethod
    def estimate_api_requests_for_users(
        num_users: int,
        sync_frequency: str = 'hourly'
    ) -> int:
        """
        Estimate API requests per month based on sync frequency
        
        Args:
            num_users: Number of users
            sync_frequency: 'real-time', 'hourly', 'daily', 'weekly'
        
        Returns:
            requests_per_month: Estimated API requests
        """
        requests_per_sync = {
            'real-time': 1,  # Continuous, estimate 1 request per minute per user
            'hourly': 1,
            'daily': 1,
            'weekly': 1
        }
        
        syncs_per_month = {
            'real-time': 60 * 24 * 30,  # Per minute
            'hourly': 24 * 30,
            'daily': 30,
            'weekly': 4
        }
        
        requests_per_user = requests_per_sync.get(sync_frequency, 1) * syncs_per_month.get(sync_frequency, 30)
        total_requests = num_users * requests_per_user
        
        return int(total_requests)

