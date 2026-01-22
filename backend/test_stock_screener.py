#!/usr/bin/env python3
"""
Test script for Stock Screener Service
Tests the provided screen definition and validates output
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


# User's screen definition
SCREEN_DEFINITION = {
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


def test_validation():
    """Test screen definition validation"""
    print("=" * 60)
    print("TEST: Validating Screen Definition")
    print("=" * 60)
    
    result = validate_screen_definition(SCREEN_DEFINITION)
    print(f"Valid: {result['valid']}")
    
    if result['errors']:
        print(f"Errors: {result['errors']}")
    if result['warnings']:
        print(f"Warnings: {result['warnings']}")
    
    print()
    return result['valid']


def test_available_fields():
    """Test getting available fields"""
    print("=" * 60)
    print("TEST: Available Screen Fields")
    print("=" * 60)
    
    fields = get_available_screen_fields()
    for category, field_list in fields.items():
        print(f"\n{category.upper()}:")
        print(f"  {', '.join(field_list)}")
    
    print()


def test_screen_execution():
    """Test executing the screen"""
    print("=" * 60)
    print("TEST: Executing Stock Screen")
    print("=" * 60)
    
    result = execute_stock_screen(SCREEN_DEFINITION)
    
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
    
    print(f"\n{'='*60}")
    print("MATCHING STOCKS")
    print("="*60)
    
    # Print header
    fields = SCREEN_DEFINITION['output']['fields']
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
    print("=" * 60)
    print("TEST: Edge Cases")
    print("=" * 60)
    
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
    print("\n" + "="*60)
    print("STOCK SCREENER SERVICE TESTS")
    print("="*60 + "\n")
    
    # Test validation
    is_valid = test_validation()
    if not is_valid:
        print("ERROR: Screen definition is invalid!")
        return 1
    
    # Test available fields
    test_available_fields()
    
    # Test execution
    result = test_screen_execution()
    
    # Test edge cases
    test_edge_cases()
    
    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Screen executed successfully!")
    print(f"Found {result['count']} stocks matching your criteria:")
    print(f"  - Mid-cap US stocks ($2B-$15B market cap)")
    print(f"  - Listed on NYSE or NASDAQ")
    print(f"  - Strong fundamentals (PE < 40, low debt, profitable)")
    print(f"  - Technical oversold condition (RSI < 40)")
    print(f"  - Excluding Utilities and REITs sectors")
    print(f"  - Sorted by market cap (ascending)")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
