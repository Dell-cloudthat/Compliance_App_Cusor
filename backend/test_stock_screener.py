#!/usr/bin/env python3
"""
Test script for Stock Screener Service
Tests both mid-cap and small-cap screen definitions
"""

import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from services.stock_screener_service import (
    execute_stock_screen,
    validate_screen_definition,
    get_available_screen_fields,
    get_screener_service
)


# Mid-cap screen definition ($2B - $15B)
MID_CAP_SCREEN = {
    "universe": {
        "country": "USA",
        "market_cap_usd": {
            "min": 2000000000,
            "max": 15000000000
        },
        "exchange": ["NYSE", "NASDAQ"]
    },
    "fundamentals": {
        "pe_ttm": {"lt": 40},
        "pe_forward": {"lt": 35},
        "debt_to_equity": {"lt": 0.5},
        "interest_coverage": {"gt": 4},
        "eps_growth_forward_2y": {"gt": 0},
        "roe": {"gt": 0.10},
        "revenue_growth_yoy": {"gt": 0}
    },
    "technicals": {
        "rsi_14": {"lt": 40},
        "average_volume_30d": {"gt": 500000},
        "price_usd": {"gt": 10}
    },
    "exclusions": {
        "market_cap_usd": {"lt": 2000000000},
        "sectors": ["Utilities", "REITs"]
    },
    "sort": {
        "field": "market_cap_usd",
        "order": "asc"
    },
    "output": {
        "limit": 30,
        "fields": [
            "ticker",
            "market_cap_usd",
            "pe_ttm",
            "debt_to_equity",
            "rsi_14",
            "eps_growth_forward_2y",
            "roe"
        ]
    }
}


# Small-cap screen definition ($300M - $2B)
SMALL_CAP_SCREEN = {
    "universe": {
        "country": "USA",
        "market_cap_usd": {
            "min": 300000000,
            "max": 2000000000
        },
        "exchange": ["NYSE", "NASDAQ"]
    },
    "fundamentals": {
        "pe_ttm": {"lt": 35},
        "pe_forward": {"lt": 30},
        "debt_to_equity": {"lt": 0.4},
        "interest_coverage": {"gt": 5},
        "eps_growth_forward_2y": {"gt": 5},
        "roe": {"gt": 0.12},
        "revenue_growth_yoy": {"gt": 5}
    },
    "technicals": {
        "rsi_14": {"lt": 40},
        "average_volume_30d": {"gt": 300000},
        "price_usd": {"gt": 5}
    },
    "exclusions": {
        "sectors": ["Biotechnology", "Cannabis", "Crypto", "SPAC"]
    },
    "sort": {
        "field": "market_cap_usd",
        "order": "asc"
    },
    "output": {
        "limit": 40,
        "fields": [
            "ticker",
            "market_cap_usd",
            "pe_ttm",
            "debt_to_equity",
            "rsi_14",
            "eps_growth_forward_2y",
            "roe"
        ]
    }
}


def test_validation(screen_def, screen_name):
    """Test screen definition validation"""
    print("=" * 70)
    print(f"VALIDATING: {screen_name}")
    print("=" * 70)
    
    result = validate_screen_definition(screen_def)
    print(f"Valid: {result['valid']}")
    
    if result['errors']:
        print(f"Errors: {result['errors']}")
    if result['warnings']:
        print(f"Warnings: {result['warnings']}")
    
    print()
    return result['valid']


def test_available_fields():
    """Test getting available fields"""
    print("=" * 70)
    print("AVAILABLE SCREEN FIELDS")
    print("=" * 70)
    
    fields = get_available_screen_fields()
    for category, field_list in fields.items():
        print(f"\n{category.upper()}:")
        print(f"  {', '.join(field_list)}")
    
    print()


def test_screen_execution(screen_def, screen_name, description):
    """Test executing the screen"""
    print("=" * 70)
    print(f"EXECUTING: {screen_name}")
    print(f"Description: {description}")
    print("=" * 70)
    
    result = execute_stock_screen(screen_def)
    
    print(f"\nScreen Execution Results:")
    print(f"  Success: {result['success']}")
    print(f"  Total Stocks Screened: {result['total_screened']}")
    print(f"  Matching Stocks: {result['count']}")
    print(f"  Executed At: {result['executed_at']}")
    
    print(f"\nFilters Applied:")
    for category, count in result['filters_applied'].items():
        print(f"  {category}: {count} conditions")
    
    print(f"\nSort Configuration:")
    print(f"  Field: {result['sort'].get('field', 'N/A')}")
    print(f"  Order: {result['sort'].get('order', 'N/A')}")
    
    print(f"\n{'-'*70}")
    print("MATCHING STOCKS")
    print("-"*70)
    
    # Print header
    fields = screen_def['output']['fields']
    header = " | ".join([f"{f:>20}" for f in fields])
    print(header)
    print("-" * len(header))
    
    # Print each stock
    for stock in result['results']:
        row = " | ".join([
            f"{format_value(stock.get(f)):>20}" 
            for f in fields
        ])
        print(row)
    
    print()
    return result


def format_value(value):
    """Format a value for display"""
    if value is None:
        return "N/A"
    if isinstance(value, float):
        if abs(value) >= 1000000000:
            return f"${value/1000000000:.1f}B"
        elif abs(value) >= 1000000:
            return f"${value/1000000:.1f}M"
        elif abs(value) < 1:
            return f"{value:.2%}"
        else:
            return f"{value:.2f}"
    return str(value)


def test_edge_cases():
    """Test edge cases"""
    print("=" * 70)
    print("EDGE CASE TESTS")
    print("=" * 70)
    
    # Test with empty definition
    print("\n1. Empty definition:")
    result = validate_screen_definition({})
    print(f"   Valid: {result['valid']}, Warnings: {len(result['warnings'])}")
    
    # Test with invalid operator
    print("\n2. Invalid operator:")
    invalid_def = {
        "fundamentals": {
            "pe_ttm": {"invalid_op": 30}
        }
    }
    result = validate_screen_definition(invalid_def)
    print(f"   Valid: {result['valid']}, Errors: {result['errors']}")
    
    # Test screen that excludes everything
    print("\n3. Very restrictive screen (should return 0 results):")
    restrictive_def = {
        "fundamentals": {
            "pe_ttm": {"lt": 1},
            "roe": {"gt": 0.99}
        }
    }
    result = execute_stock_screen(restrictive_def)
    print(f"   Results: {result['count']}")
    
    print()


def main():
    """Run all tests"""
    print("\n" + "="*70)
    print(" " * 20 + "STOCK SCREENER SERVICE TESTS")
    print("="*70 + "\n")
    
    # Test available fields
    test_available_fields()
    
    # ========== MID-CAP SCREEN ==========
    print("\n" + "#"*70)
    print("#" + " "*25 + "MID-CAP SCREEN" + " "*29 + "#")
    print("#"*70 + "\n")
    
    is_valid = test_validation(MID_CAP_SCREEN, "Mid-Cap Screen ($2B - $15B)")
    if not is_valid:
        print("ERROR: Mid-Cap screen definition is invalid!")
    else:
        mid_cap_result = test_screen_execution(
            MID_CAP_SCREEN, 
            "Mid-Cap Screen",
            "US mid-cap stocks with strong fundamentals and oversold technicals"
        )
    
    # ========== SMALL-CAP SCREEN ==========
    print("\n" + "#"*70)
    print("#" + " "*24 + "SMALL-CAP SCREEN" + " "*28 + "#")
    print("#"*70 + "\n")
    
    is_valid = test_validation(SMALL_CAP_SCREEN, "Small-Cap Screen ($300M - $2B)")
    if not is_valid:
        print("ERROR: Small-Cap screen definition is invalid!")
    else:
        small_cap_result = test_screen_execution(
            SMALL_CAP_SCREEN, 
            "Small-Cap Screen",
            "US small-cap stocks with quality fundamentals, excluding risky sectors"
        )
    
    # Test edge cases
    test_edge_cases()
    
    # ========== SUMMARY ==========
    print("=" * 70)
    print(" " * 28 + "SUMMARY")
    print("=" * 70)
    
    print("\nMID-CAP SCREEN RESULTS:")
    print(f"  Found {mid_cap_result['count']} stocks matching criteria:")
    print(f"  - Market cap: $2B - $15B")
    print(f"  - PE < 40, D/E < 0.5, ROE > 10%")
    print(f"  - RSI < 40 (oversold)")
    print(f"  - Excluding: Utilities, REITs")
    
    print("\nSMALL-CAP SCREEN RESULTS:")
    print(f"  Found {small_cap_result['count']} stocks matching criteria:")
    print(f"  - Market cap: $300M - $2B")
    print(f"  - PE < 35, D/E < 0.4, ROE > 12%")
    print(f"  - RSI < 40 (oversold)")
    print(f"  - Excluding: Biotechnology, Cannabis, Crypto, SPAC")
    
    print("\n" + "="*70)
    print("All tests completed successfully!")
    print("="*70 + "\n")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
