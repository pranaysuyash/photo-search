"""
Enhanced data models for smart collection rules.
"""
from __future__ import annotations
from typing import Dict, List, Union, Optional, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class RuleType(Enum):
    """Types of available rules."""
    QUERY = "query"
    TAGS = "tags"
    FAVORITES = "favorites"
    PEOPLE = "people"
    DATES = "dates"
    EXIF = "exif"
    LOCATION = "location"
    VISUAL_SIMILARITY = "visual_similarity"
    TEMPORAL_CLUSTER = "temporal_cluster"
    STYLE = "style"
    CAMERA = "camera"
    RATING = "rating"


class ComparisonOperator(Enum):
    """Comparison operators for rule conditions."""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    GREATER_THAN_OR_EQUAL = "greater_than_or_equal"
    LESS_THAN_OR_EQUAL = "less_than_or_equal"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    BETWEEN = "between"
    NOT_BETWEEN = "not_between"


class RuleCondition(BaseModel):
    """A single condition within a smart collection rule."""
    field: str
    operator: ComparisonOperator
    value: Union[str, int, float, List[Any], Dict[str, Any]]
    weight: Optional[float] = 1.0  # For ranking/filtering results


class BooleanOperator(Enum):
    """Boolean operators for combining rules."""
    AND = "and"
    OR = "or"
    NOT = "not"


class SmartCollectionRule(BaseModel):
    """A single rule within a smart collection."""
    type: RuleType
    conditions: List[RuleCondition]
    boolean_operator: BooleanOperator = BooleanOperator.AND
    enabled: bool = True
    weight: Optional[float] = 1.0  # For ranking importance of this rule


class SmartCollectionConfig(BaseModel):
    """Configuration for a single smart collection."""
    name: str
    description: Optional[str] = None
    rules: List[SmartCollectionRule]
    rule_combination: BooleanOperator = BooleanOperator.AND
    max_results: Optional[int] = None
    sort_by: Optional[str] = "relevance"  # Options: relevance, date, rating, etc.
    sort_direction: Optional[str] = "desc"  # Options: asc, desc
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SmartCollectionGroup(BaseModel):
    """A group of related smart collection rules."""
    name: str
    collections: List[SmartCollectionConfig]
    priority: int = 0
    enabled: bool = True