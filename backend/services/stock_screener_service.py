"""
Stock Screener Service
Parses and executes stock screening definitions to filter stocks
based on universe, fundamentals, technicals, and exclusion criteria.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import sqlite3
from pathlib import Path
from datetime import datetime
import json


# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"


class ComparisonOperator(Enum):
    """Supported comparison operators for filters."""
    LT = "lt"      # Less than
    GT = "gt"      # Greater than
    LTE = "lte"    # Less than or equal
    GTE = "gte"    # Greater than or equal
    EQ = "eq"      # Equal
    NE = "ne"      # Not equal
    IN = "in"      # In list
    NOT_IN = "not_in"  # Not in list


@dataclass
class FilterCondition:
    """Represents a single filter condition."""
    field: str
    operator: ComparisonOperator
    value: Any
    
    def evaluate(self, stock_value: Any) -> bool:
        """Evaluate if the stock value passes this condition."""
        if stock_value is None:
            return False
            
        if self.operator == ComparisonOperator.LT:
            return stock_value < self.value
        elif self.operator == ComparisonOperator.GT:
            return stock_value > self.value
        elif self.operator == ComparisonOperator.LTE:
            return stock_value <= self.value
        elif self.operator == ComparisonOperator.GTE:
            return stock_value >= self.value
        elif self.operator == ComparisonOperator.EQ:
            return stock_value == self.value
        elif self.operator == ComparisonOperator.NE:
            return stock_value != self.value
        elif self.operator == ComparisonOperator.IN:
            return stock_value in self.value
        elif self.operator == ComparisonOperator.NOT_IN:
            return stock_value not in self.value
        return False


@dataclass
class ScreenDefinition:
    """Parsed stock screening definition."""
    universe: Dict[str, Any] = field(default_factory=dict)
    fundamentals: Dict[str, Any] = field(default_factory=dict)
    technicals: Dict[str, Any] = field(default_factory=dict)
    exclusions: Dict[str, Any] = field(default_factory=dict)
    sort: Dict[str, str] = field(default_factory=dict)
    output: Dict[str, Any] = field(default_factory=dict)


@dataclass 
class Stock:
    """Represents a stock with all available data fields."""
    ticker: str
    company_name: str
    country: str
    exchange: str
    sector: str
    industry: str
    market_cap_usd: float
    # Fundamentals
    pe_ttm: Optional[float] = None
    pe_forward: Optional[float] = None
    debt_to_equity: Optional[float] = None
    interest_coverage: Optional[float] = None
    eps_growth_forward_2y: Optional[float] = None
    roe: Optional[float] = None
    revenue_growth_yoy: Optional[float] = None
    profit_margin: Optional[float] = None
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    peg_ratio: Optional[float] = None
    price_to_book: Optional[float] = None
    price_to_sales: Optional[float] = None
    # Technicals
    rsi_14: Optional[float] = None
    average_volume_30d: Optional[float] = None
    price_usd: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    price_change_1m: Optional[float] = None
    price_change_3m: Optional[float] = None
    price_change_1y: Optional[float] = None
    beta: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert stock to dictionary."""
        return {
            "ticker": self.ticker,
            "company_name": self.company_name,
            "country": self.country,
            "exchange": self.exchange,
            "sector": self.sector,
            "industry": self.industry,
            "market_cap_usd": self.market_cap_usd,
            "pe_ttm": self.pe_ttm,
            "pe_forward": self.pe_forward,
            "debt_to_equity": self.debt_to_equity,
            "interest_coverage": self.interest_coverage,
            "eps_growth_forward_2y": self.eps_growth_forward_2y,
            "roe": self.roe,
            "revenue_growth_yoy": self.revenue_growth_yoy,
            "profit_margin": self.profit_margin,
            "current_ratio": self.current_ratio,
            "quick_ratio": self.quick_ratio,
            "dividend_yield": self.dividend_yield,
            "peg_ratio": self.peg_ratio,
            "price_to_book": self.price_to_book,
            "price_to_sales": self.price_to_sales,
            "rsi_14": self.rsi_14,
            "average_volume_30d": self.average_volume_30d,
            "price_usd": self.price_usd,
            "sma_50": self.sma_50,
            "sma_200": self.sma_200,
            "price_change_1m": self.price_change_1m,
            "price_change_3m": self.price_change_3m,
            "price_change_1y": self.price_change_1y,
            "beta": self.beta,
        }
    
    def get_value(self, field_name: str) -> Any:
        """Get value for a specific field."""
        return getattr(self, field_name, None)


class StockScreenerService:
    """Service for parsing and executing stock screen definitions."""
    
    # Map operator strings to enum
    OPERATOR_MAP = {
        "lt": ComparisonOperator.LT,
        "gt": ComparisonOperator.GT,
        "lte": ComparisonOperator.LTE,
        "gte": ComparisonOperator.GTE,
        "eq": ComparisonOperator.EQ,
        "ne": ComparisonOperator.NE,
        "in": ComparisonOperator.IN,
        "not_in": ComparisonOperator.NOT_IN,
        "min": ComparisonOperator.GTE,  # Alias for range filters
        "max": ComparisonOperator.LTE,  # Alias for range filters
    }
    
    def __init__(self):
        self.stocks: List[Stock] = []
        self._load_demo_stocks()
    
    def _get_db(self):
        """Get database connection."""
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        return conn
    
    def _load_demo_stocks(self):
        """Load demo stock data for testing."""
        # Demo stocks representing various mid-cap US companies
        demo_data = [
            # Tech stocks
            Stock("DDOG", "Datadog Inc", "USA", "NASDAQ", "Technology", "Software", 12500000000,
                  pe_ttm=85, pe_forward=65, debt_to_equity=0.3, interest_coverage=15, eps_growth_forward_2y=0.25,
                  roe=0.15, revenue_growth_yoy=0.30, profit_margin=0.08, current_ratio=2.5, quick_ratio=2.3,
                  rsi_14=45, average_volume_30d=3500000, price_usd=125, sma_50=120, sma_200=110, beta=1.2),
            Stock("NET", "Cloudflare Inc", "USA", "NYSE", "Technology", "Software", 8500000000,
                  pe_ttm=None, pe_forward=120, debt_to_equity=0.2, interest_coverage=None, eps_growth_forward_2y=0.35,
                  roe=-0.05, revenue_growth_yoy=0.40, profit_margin=-0.10, current_ratio=3.0, quick_ratio=2.8,
                  rsi_14=38, average_volume_30d=4500000, price_usd=55, sma_50=52, sma_200=48, beta=1.4),
            Stock("HUBS", "HubSpot Inc", "USA", "NYSE", "Technology", "Software", 9200000000,
                  pe_ttm=180, pe_forward=80, debt_to_equity=0.15, interest_coverage=20, eps_growth_forward_2y=0.28,
                  roe=0.08, revenue_growth_yoy=0.25, profit_margin=0.05, current_ratio=2.2, quick_ratio=2.0,
                  rsi_14=42, average_volume_30d=800000, price_usd=185, sma_50=180, sma_200=170, beta=1.3),
            Stock("BILL", "Bill Holdings Inc", "USA", "NYSE", "Technology", "Fintech", 5500000000,
                  pe_ttm=None, pe_forward=45, debt_to_equity=0.1, interest_coverage=None, eps_growth_forward_2y=0.30,
                  roe=0.02, revenue_growth_yoy=0.35, profit_margin=0.03, current_ratio=2.8, quick_ratio=2.6,
                  rsi_14=35, average_volume_30d=1200000, price_usd=52, sma_50=48, sma_200=55, beta=1.5),
            Stock("ZS", "Zscaler Inc", "USA", "NASDAQ", "Technology", "Cybersecurity", 14000000000,
                  pe_ttm=200, pe_forward=90, debt_to_equity=0.25, interest_coverage=12, eps_growth_forward_2y=0.32,
                  roe=0.12, revenue_growth_yoy=0.38, profit_margin=0.06, current_ratio=2.4, quick_ratio=2.2,
                  rsi_14=48, average_volume_30d=2100000, price_usd=155, sma_50=150, sma_200=140, beta=1.3),
            
            # Healthcare
            Stock("ALGN", "Align Technology", "USA", "NASDAQ", "Healthcare", "Medical Devices", 11500000000,
                  pe_ttm=35, pe_forward=28, debt_to_equity=0.05, interest_coverage=50, eps_growth_forward_2y=0.18,
                  roe=0.22, revenue_growth_yoy=0.12, profit_margin=0.15, current_ratio=3.5, quick_ratio=3.2,
                  rsi_14=38, average_volume_30d=950000, price_usd=150, sma_50=145, sma_200=160, beta=1.1),
            Stock("INSP", "Inspire Medical Systems", "USA", "NYSE", "Healthcare", "Medical Devices", 8800000000,
                  pe_ttm=None, pe_forward=75, debt_to_equity=0.08, interest_coverage=None, eps_growth_forward_2y=0.45,
                  roe=-0.02, revenue_growth_yoy=0.55, profit_margin=-0.05, current_ratio=4.0, quick_ratio=3.8,
                  rsi_14=32, average_volume_30d=650000, price_usd=295, sma_50=280, sma_200=250, beta=0.9),
            Stock("HOLX", "Hologic Inc", "USA", "NASDAQ", "Healthcare", "Diagnostics", 10200000000,
                  pe_ttm=18, pe_forward=15, debt_to_equity=0.45, interest_coverage=8, eps_growth_forward_2y=0.08,
                  roe=0.18, revenue_growth_yoy=0.05, profit_margin=0.20, current_ratio=2.0, quick_ratio=1.7,
                  rsi_14=36, average_volume_30d=1800000, price_usd=45, sma_50=43, sma_200=48, beta=0.8),
            
            # Industrials
            Stock("GNRC", "Generac Holdings", "USA", "NYSE", "Industrials", "Electrical Equipment", 6800000000,
                  pe_ttm=22, pe_forward=18, debt_to_equity=0.35, interest_coverage=10, eps_growth_forward_2y=0.15,
                  roe=0.25, revenue_growth_yoy=0.08, profit_margin=0.12, current_ratio=2.2, quick_ratio=1.5,
                  rsi_14=33, average_volume_30d=1500000, price_usd=105, sma_50=100, sma_200=115, beta=1.4),
            Stock("AXON", "Axon Enterprise", "USA", "NASDAQ", "Industrials", "Security Equipment", 13500000000,
                  pe_ttm=75, pe_forward=55, debt_to_equity=0.12, interest_coverage=25, eps_growth_forward_2y=0.28,
                  roe=0.16, revenue_growth_yoy=0.32, profit_margin=0.10, current_ratio=3.2, quick_ratio=3.0,
                  rsi_14=52, average_volume_30d=750000, price_usd=180, sma_50=175, sma_200=155, beta=1.0),
            Stock("TREX", "Trex Company", "USA", "NYSE", "Industrials", "Building Products", 7500000000,
                  pe_ttm=28, pe_forward=24, debt_to_equity=0.0, interest_coverage=None, eps_growth_forward_2y=0.12,
                  roe=0.35, revenue_growth_yoy=0.10, profit_margin=0.22, current_ratio=4.5, quick_ratio=4.0,
                  rsi_14=39, average_volume_30d=1100000, price_usd=68, sma_50=65, sma_200=72, beta=1.2),
            
            # Consumer Discretionary
            Stock("POOL", "Pool Corporation", "USA", "NASDAQ", "Consumer Discretionary", "Distributors", 12000000000,
                  pe_ttm=25, pe_forward=22, debt_to_equity=0.40, interest_coverage=12, eps_growth_forward_2y=0.10,
                  roe=0.45, revenue_growth_yoy=0.06, profit_margin=0.11, current_ratio=2.3, quick_ratio=1.2,
                  rsi_14=37, average_volume_30d=550000, price_usd=310, sma_50=300, sma_200=320, beta=1.0),
            Stock("WSM", "Williams-Sonoma", "USA", "NYSE", "Consumer Discretionary", "Home Furnishings", 8500000000,
                  pe_ttm=12, pe_forward=11, debt_to_equity=0.20, interest_coverage=18, eps_growth_forward_2y=0.05,
                  roe=0.55, revenue_growth_yoy=0.02, profit_margin=0.14, current_ratio=1.8, quick_ratio=1.0,
                  rsi_14=41, average_volume_30d=1200000, price_usd=135, sma_50=130, sma_200=140, beta=1.3),
            Stock("DKS", "Dick's Sporting Goods", "USA", "NYSE", "Consumer Discretionary", "Retail", 9800000000,
                  pe_ttm=10, pe_forward=9, debt_to_equity=0.25, interest_coverage=15, eps_growth_forward_2y=0.03,
                  roe=0.40, revenue_growth_yoy=0.04, profit_margin=0.09, current_ratio=1.5, quick_ratio=0.8,
                  rsi_14=35, average_volume_30d=2500000, price_usd=115, sma_50=110, sma_200=125, beta=1.2),
            
            # Financials
            Stock("LPLA", "LPL Financial", "USA", "NASDAQ", "Financials", "Capital Markets", 11000000000,
                  pe_ttm=14, pe_forward=12, debt_to_equity=0.48, interest_coverage=6, eps_growth_forward_2y=0.15,
                  roe=0.28, revenue_growth_yoy=0.20, profit_margin=0.08, current_ratio=1.2, quick_ratio=1.0,
                  rsi_14=44, average_volume_30d=800000, price_usd=145, sma_50=140, sma_200=130, beta=1.1),
            Stock("RJF", "Raymond James Financial", "USA", "NYSE", "Financials", "Capital Markets", 13000000000,
                  pe_ttm=11, pe_forward=10, debt_to_equity=0.38, interest_coverage=7, eps_growth_forward_2y=0.12,
                  roe=0.20, revenue_growth_yoy=0.15, profit_margin=0.12, current_ratio=1.3, quick_ratio=1.1,
                  rsi_14=46, average_volume_30d=650000, price_usd=105, sma_50=102, sma_200=95, beta=1.0),
            
            # Materials
            Stock("VMC", "Vulcan Materials", "USA", "NYSE", "Materials", "Construction Materials", 14200000000,
                  pe_ttm=32, pe_forward=28, debt_to_equity=0.42, interest_coverage=8, eps_growth_forward_2y=0.18,
                  roe=0.12, revenue_growth_yoy=0.12, profit_margin=0.15, current_ratio=2.0, quick_ratio=1.5,
                  rsi_14=42, average_volume_30d=900000, price_usd=210, sma_50=205, sma_200=195, beta=0.9),
            Stock("MLM", "Martin Marietta", "USA", "NYSE", "Materials", "Construction Materials", 12800000000,
                  pe_ttm=30, pe_forward=26, debt_to_equity=0.35, interest_coverage=9, eps_growth_forward_2y=0.16,
                  roe=0.14, revenue_growth_yoy=0.14, profit_margin=0.17, current_ratio=2.2, quick_ratio=1.6,
                  rsi_14=40, average_volume_30d=400000, price_usd=390, sma_50=380, sma_200=360, beta=0.85),
            
            # Utilities (to test exclusions)
            Stock("AES", "AES Corporation", "USA", "NYSE", "Utilities", "Electric Utilities", 9500000000,
                  pe_ttm=8, pe_forward=7, debt_to_equity=2.5, interest_coverage=2, eps_growth_forward_2y=0.08,
                  roe=0.15, revenue_growth_yoy=0.05, profit_margin=0.06, current_ratio=1.0, quick_ratio=0.8,
                  rsi_14=28, average_volume_30d=5000000, price_usd=14, sma_50=13, sma_200=15, beta=0.7),
            
            # REITs (to test exclusions)
            Stock("DLR", "Digital Realty Trust", "USA", "NYSE", "REITs", "Data Center REITs", 13500000000,
                  pe_ttm=45, pe_forward=40, debt_to_equity=1.2, interest_coverage=3, eps_growth_forward_2y=0.10,
                  roe=0.05, revenue_growth_yoy=0.15, profit_margin=0.10, current_ratio=0.5, quick_ratio=0.3,
                  rsi_14=38, average_volume_30d=2200000, price_usd=135, sma_50=130, sma_200=125, beta=0.6),
            
            # More qualifying mid-caps
            Stock("MANH", "Manhattan Associates", "USA", "NASDAQ", "Technology", "Software", 10500000000,
                  pe_ttm=38, pe_forward=32, debt_to_equity=0.02, interest_coverage=100, eps_growth_forward_2y=0.20,
                  roe=0.45, revenue_growth_yoy=0.18, profit_margin=0.22, current_ratio=3.8, quick_ratio=3.5,
                  rsi_14=36, average_volume_30d=650000, price_usd=165, sma_50=160, sma_200=150, beta=1.0),
            Stock("ENTG", "Entegris Inc", "USA", "NASDAQ", "Technology", "Semiconductors", 11200000000,
                  pe_ttm=28, pe_forward=24, debt_to_equity=0.45, interest_coverage=7, eps_growth_forward_2y=0.22,
                  roe=0.18, revenue_growth_yoy=0.15, profit_margin=0.14, current_ratio=2.5, quick_ratio=2.0,
                  rsi_14=34, average_volume_30d=1800000, price_usd=75, sma_50=72, sma_200=80, beta=1.3),
            Stock("FND", "Floor & Decor Holdings", "USA", "NYSE", "Consumer Discretionary", "Home Improvement Retail", 8200000000,
                  pe_ttm=25, pe_forward=21, debt_to_equity=0.30, interest_coverage=12, eps_growth_forward_2y=0.18,
                  roe=0.20, revenue_growth_yoy=0.12, profit_margin=0.08, current_ratio=1.8, quick_ratio=0.6,
                  rsi_14=31, average_volume_30d=1400000, price_usd=95, sma_50=90, sma_200=100, beta=1.4),
            Stock("SAIA", "Saia Inc", "USA", "NASDAQ", "Industrials", "Trucking", 9500000000,
                  pe_ttm=22, pe_forward=18, debt_to_equity=0.15, interest_coverage=20, eps_growth_forward_2y=0.14,
                  roe=0.25, revenue_growth_yoy=0.10, profit_margin=0.12, current_ratio=1.5, quick_ratio=1.3,
                  rsi_14=38, average_volume_30d=550000, price_usd=350, sma_50=340, sma_200=320, beta=1.1),
            Stock("WDAY", "Workday Inc", "USA", "NASDAQ", "Technology", "Enterprise Software", 14500000000,
                  pe_ttm=None, pe_forward=42, debt_to_equity=0.18, interest_coverage=None, eps_growth_forward_2y=0.25,
                  roe=0.08, revenue_growth_yoy=0.22, profit_margin=0.04, current_ratio=2.0, quick_ratio=1.8,
                  rsi_14=39, average_volume_30d=2500000, price_usd=185, sma_50=180, sma_200=175, beta=1.2),
            
            # Add more for variety
            Stock("DECK", "Deckers Outdoor", "USA", "NYSE", "Consumer Discretionary", "Footwear", 14800000000,
                  pe_ttm=22, pe_forward=19, debt_to_equity=0.05, interest_coverage=80, eps_growth_forward_2y=0.15,
                  roe=0.32, revenue_growth_yoy=0.18, profit_margin=0.16, current_ratio=3.5, quick_ratio=2.5,
                  rsi_14=48, average_volume_30d=750000, price_usd=580, sma_50=560, sma_200=500, beta=1.1),
            Stock("TECH", "Bio-Techne Corp", "USA", "NASDAQ", "Healthcare", "Life Sciences", 9200000000,
                  pe_ttm=35, pe_forward=30, debt_to_equity=0.20, interest_coverage=15, eps_growth_forward_2y=0.12,
                  roe=0.15, revenue_growth_yoy=0.08, profit_margin=0.25, current_ratio=4.0, quick_ratio=3.5,
                  rsi_14=32, average_volume_30d=450000, price_usd=62, sma_50=60, sma_200=68, beta=0.9),
            Stock("EXPE", "Expedia Group", "USA", "NASDAQ", "Consumer Discretionary", "Travel", 12500000000,
                  pe_ttm=15, pe_forward=12, debt_to_equity=0.48, interest_coverage=5, eps_growth_forward_2y=0.18,
                  roe=0.22, revenue_growth_yoy=0.15, profit_margin=0.08, current_ratio=1.2, quick_ratio=1.0,
                  rsi_14=37, average_volume_30d=2800000, price_usd=95, sma_50=92, sma_200=105, beta=1.5),
            Stock("MKTX", "MarketAxess Holdings", "USA", "NASDAQ", "Financials", "Capital Markets", 7800000000,
                  pe_ttm=32, pe_forward=28, debt_to_equity=0.02, interest_coverage=200, eps_growth_forward_2y=0.10,
                  roe=0.25, revenue_growth_yoy=0.08, profit_margin=0.35, current_ratio=5.0, quick_ratio=4.8,
                  rsi_14=29, average_volume_30d=600000, price_usd=205, sma_50=198, sma_200=220, beta=0.8),
            Stock("FFIV", "F5 Inc", "USA", "NASDAQ", "Technology", "Networking", 9000000000,
                  pe_ttm=18, pe_forward=15, debt_to_equity=0.25, interest_coverage=12, eps_growth_forward_2y=0.08,
                  roe=0.22, revenue_growth_yoy=0.05, profit_margin=0.18, current_ratio=2.0, quick_ratio=1.8,
                  rsi_14=35, average_volume_30d=700000, price_usd=155, sma_50=150, sma_200=160, beta=0.95),
        ]
        self.stocks = demo_data
    
    def parse_definition(self, definition: Dict[str, Any]) -> ScreenDefinition:
        """Parse a stock screen definition from JSON format."""
        screen = ScreenDefinition(
            universe=definition.get("universe", {}),
            fundamentals=definition.get("fundamentals", {}),
            technicals=definition.get("technicals", {}),
            exclusions=definition.get("exclusions", {}),
            sort=definition.get("sort", {}),
            output=definition.get("output", {})
        )
        return screen
    
    def _parse_filter_conditions(self, filters: Dict[str, Any]) -> List[FilterCondition]:
        """Parse filter dictionary into FilterCondition objects."""
        conditions = []
        
        for field, criteria in filters.items():
            if isinstance(criteria, dict):
                for op, value in criteria.items():
                    if op in self.OPERATOR_MAP:
                        conditions.append(FilterCondition(
                            field=field,
                            operator=self.OPERATOR_MAP[op],
                            value=value
                        ))
            elif isinstance(criteria, list):
                # List values are treated as "in" conditions
                conditions.append(FilterCondition(
                    field=field,
                    operator=ComparisonOperator.IN,
                    value=criteria
                ))
            else:
                # Direct value is treated as equality
                conditions.append(FilterCondition(
                    field=field,
                    operator=ComparisonOperator.EQ,
                    value=criteria
                ))
        
        return conditions
    
    def _stock_passes_conditions(self, stock: Stock, conditions: List[FilterCondition]) -> bool:
        """Check if a stock passes all filter conditions."""
        for condition in conditions:
            stock_value = stock.get_value(condition.field)
            if not condition.evaluate(stock_value):
                return False
        return True
    
    def _apply_exclusions(self, stock: Stock, exclusions: Dict[str, Any]) -> bool:
        """Check if a stock should be excluded. Returns True if stock should be EXCLUDED."""
        # Sector exclusions
        excluded_sectors = exclusions.get("sectors", [])
        if stock.sector in excluded_sectors:
            return True
        
        # Market cap exclusions
        if "market_cap_usd" in exclusions:
            cap_exclusion = exclusions["market_cap_usd"]
            if isinstance(cap_exclusion, dict):
                if "lt" in cap_exclusion and stock.market_cap_usd < cap_exclusion["lt"]:
                    return True
                if "gt" in cap_exclusion and stock.market_cap_usd > cap_exclusion["gt"]:
                    return True
        
        # Other field-based exclusions
        for field, criteria in exclusions.items():
            if field in ["sectors", "market_cap_usd"]:
                continue  # Already handled
            
            stock_value = stock.get_value(field)
            if stock_value is None:
                continue
                
            if isinstance(criteria, dict):
                for op, value in criteria.items():
                    if op == "lt" and stock_value < value:
                        return True
                    elif op == "gt" and stock_value > value:
                        return True
                    elif op == "eq" and stock_value == value:
                        return True
        
        return False
    
    def execute_screen(self, definition: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a stock screen and return matching results."""
        screen = self.parse_definition(definition)
        
        # Start with all stocks
        candidates = list(self.stocks)
        
        # Apply universe filters
        universe_conditions = self._parse_filter_conditions(screen.universe)
        candidates = [s for s in candidates if self._stock_passes_conditions(s, universe_conditions)]
        
        # Apply fundamental filters
        fundamental_conditions = self._parse_filter_conditions(screen.fundamentals)
        candidates = [s for s in candidates if self._stock_passes_conditions(s, fundamental_conditions)]
        
        # Apply technical filters
        technical_conditions = self._parse_filter_conditions(screen.technicals)
        candidates = [s for s in candidates if self._stock_passes_conditions(s, technical_conditions)]
        
        # Apply exclusions
        candidates = [s for s in candidates if not self._apply_exclusions(s, screen.exclusions)]
        
        # Sort results
        sort_field = screen.sort.get("field", "market_cap_usd")
        sort_order = screen.sort.get("order", "desc")
        reverse = sort_order.lower() == "desc"
        
        candidates.sort(
            key=lambda s: s.get_value(sort_field) or 0,
            reverse=reverse
        )
        
        # Apply output limit
        limit = screen.output.get("limit", 50)
        candidates = candidates[:limit]
        
        # Format output with requested fields
        output_fields = screen.output.get("fields", [])
        
        results = []
        for stock in candidates:
            if output_fields:
                result = {field: stock.get_value(field) for field in output_fields}
            else:
                result = stock.to_dict()
            results.append(result)
        
        return {
            "success": True,
            "count": len(results),
            "total_screened": len(self.stocks),
            "filters_applied": {
                "universe": len(universe_conditions),
                "fundamentals": len(fundamental_conditions),
                "technicals": len(technical_conditions),
                "exclusions": len(screen.exclusions)
            },
            "sort": screen.sort,
            "results": results,
            "executed_at": datetime.utcnow().isoformat()
        }
    
    def validate_definition(self, definition: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a screen definition without executing it."""
        errors = []
        warnings = []
        
        # Check required sections
        if not definition:
            errors.append("Empty screen definition")
            return {"valid": False, "errors": errors, "warnings": warnings}
        
        # Validate universe
        universe = definition.get("universe", {})
        if "country" not in universe:
            warnings.append("No country specified in universe - will include all countries")
        
        # Validate operators
        valid_operators = set(self.OPERATOR_MAP.keys())
        
        for section_name in ["fundamentals", "technicals", "universe"]:
            section = definition.get(section_name, {})
            for field, criteria in section.items():
                if isinstance(criteria, dict):
                    for op in criteria.keys():
                        if op not in valid_operators:
                            errors.append(f"Invalid operator '{op}' in {section_name}.{field}")
        
        # Validate sort field
        sort_config = definition.get("sort", {})
        if sort_config:
            sort_field = sort_config.get("field")
            valid_fields = {
                "ticker", "company_name", "market_cap_usd", "pe_ttm", "pe_forward",
                "debt_to_equity", "interest_coverage", "eps_growth_forward_2y", "roe",
                "revenue_growth_yoy", "rsi_14", "average_volume_30d", "price_usd"
            }
            if sort_field and sort_field not in valid_fields:
                warnings.append(f"Sort field '{sort_field}' may not be available")
            
            sort_order = sort_config.get("order", "desc")
            if sort_order not in ["asc", "desc"]:
                errors.append(f"Invalid sort order '{sort_order}' - must be 'asc' or 'desc'")
        
        # Validate output
        output = definition.get("output", {})
        limit = output.get("limit")
        if limit is not None and (not isinstance(limit, int) or limit < 1):
            errors.append("Output limit must be a positive integer")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    def get_available_fields(self) -> Dict[str, List[str]]:
        """Return available fields for screening."""
        return {
            "universe": [
                "country", "exchange", "sector", "industry", "market_cap_usd"
            ],
            "fundamentals": [
                "pe_ttm", "pe_forward", "debt_to_equity", "interest_coverage",
                "eps_growth_forward_2y", "roe", "revenue_growth_yoy", "profit_margin",
                "current_ratio", "quick_ratio", "dividend_yield", "peg_ratio",
                "price_to_book", "price_to_sales"
            ],
            "technicals": [
                "rsi_14", "average_volume_30d", "price_usd", "sma_50", "sma_200",
                "price_change_1m", "price_change_3m", "price_change_1y", "beta"
            ],
            "operators": ["lt", "gt", "lte", "gte", "eq", "ne", "in", "not_in", "min", "max"]
        }
    
    def save_screen_definition(self, user_id: int, name: str, definition: Dict[str, Any], 
                                description: str = None) -> Dict[str, Any]:
        """Save a screen definition to the database."""
        conn = self._get_db()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO stock_screens (user_id, name, description, definition, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                name,
                description,
                json.dumps(definition),
                datetime.utcnow().isoformat(),
                datetime.utcnow().isoformat()
            ))
            conn.commit()
            screen_id = cursor.lastrowid
            
            return {
                "success": True,
                "screen_id": screen_id,
                "name": name,
                "message": "Screen definition saved successfully"
            }
        except sqlite3.OperationalError as e:
            if "no such table" in str(e):
                # Create the table if it doesn't exist
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS stock_screens (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        definition TEXT NOT NULL,
                        created_at TEXT,
                        updated_at TEXT
                    )
                """)
                conn.commit()
                # Retry the insert
                return self.save_screen_definition(user_id, name, definition, description)
            raise
        finally:
            conn.close()
    
    def get_saved_screens(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all saved screen definitions for a user."""
        conn = self._get_db()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id, name, description, definition, created_at, updated_at
                FROM stock_screens
                WHERE user_id = ?
                ORDER BY updated_at DESC
            """, (user_id,))
            
            screens = []
            for row in cursor.fetchall():
                screens.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "definition": json.loads(row[3]),
                    "created_at": row[4],
                    "updated_at": row[5]
                })
            return screens
        except sqlite3.OperationalError:
            return []
        finally:
            conn.close()


# Singleton instance
_screener_service = None


def get_screener_service() -> StockScreenerService:
    """Get the singleton screener service instance."""
    global _screener_service
    if _screener_service is None:
        _screener_service = StockScreenerService()
    return _screener_service


def execute_stock_screen(definition: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a stock screen from a JSON definition."""
    service = get_screener_service()
    return service.execute_screen(definition)


def validate_screen_definition(definition: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a screen definition."""
    service = get_screener_service()
    return service.validate_definition(definition)


def get_available_screen_fields() -> Dict[str, List[str]]:
    """Get available fields for screening."""
    service = get_screener_service()
    return service.get_available_fields()
