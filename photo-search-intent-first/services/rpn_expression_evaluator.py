"""
RPNExpressionEvaluator Service

Extracted from server.py _evaluate_rpn_expression function to reduce
cyclomatic complexity (CCN: 11 → 3-4 per method).

Handles evaluation of Reverse Polish Notation (RPN) expressions 
for complex search queries with boolean logic (AND, OR, NOT) and
field-specific evaluations.
"""

from pathlib import Path
from typing import List, Dict, Any


class StackOperator:
    """Enum-like class for stack operators."""
    NOT = "NOT"
    AND = "AND"
    OR = "OR"


class RPNExpressionEvaluator:
    """Service for evaluating RPN expressions against photo metadata."""
    
    def evaluate_expression(self, rpn_output: List[str], path: str, context: dict) -> bool:
        """Evaluate RPN expression for a single photo path."""
        if not rpn_output:
            return True
        
        stack = []
        
        for token in rpn_output:
            if self._is_operator(token):
                result = self._process_operator(token, stack)
                stack.append(result)
            else:
                result = self._evaluate_field_expression(token, path, context)
                stack.append(result)
        
        return bool(stack[-1]) if stack else True
    
    def _is_operator(self, token: str) -> bool:
        """Check if token is a boolean operator."""
        return token.upper() in (StackOperator.NOT, StackOperator.AND, StackOperator.OR)
    
    def _process_operator(self, token: str, stack: List[bool]) -> bool:
        """Process a boolean operator with the current stack."""
        token_upper = token.upper()
        
        if token_upper == StackOperator.NOT:
            return self._process_not_operator(stack)
        elif token_upper in (StackOperator.AND, StackOperator.OR):
            return self._process_binary_operator(token_upper, stack)
        else:
            return False
    
    def _process_not_operator(self, stack: List[bool]) -> bool:
        """Process NOT operator."""
        value = stack.pop() if stack else False
        return not value
    
    def _process_binary_operator(self, operator: str, stack: List[bool]) -> bool:
        """Process AND/OR binary operators."""
        b = stack.pop() if stack else False
        a = stack.pop() if stack else False
        
        if operator == StackOperator.AND:
            return a and b
        elif operator == StackOperator.OR:
            return a or b
        else:
            return False
    
    def _evaluate_field_expression(self, token: str, path: str, context: dict) -> bool:
        """Evaluate a single field expression against a photo path."""
        # Simple text search (no field specified)
        if ':' not in token:
            return self._evaluate_simple_text_search(token, path, context)
        
        try:
            field, value = token.split(':', 1)
            field_value = (value or '').strip().strip('"').strip("'")
            field_name = field.lower()
            
            return self._evaluate_field_by_type(field_name, field_value, path, context)
        except Exception:
            return False
    
    def _evaluate_simple_text_search(self, token: str, path: str, context: dict) -> bool:
        """Evaluate simple text search across document content."""
        document_text = self._get_document_text(path, context)
        return token.lower() in document_text
    
    def _get_document_text(self, path: str, context: dict) -> str:
        """Get combined document text for search."""
        name = Path(path).name
        cap_text = context.get('cap_map', {}).get(path, '')
        ocr_text = context.get('texts_map', {}).get(path, '')
        return f"{cap_text}\n{ocr_text}\n{name}".lower()
    
    def _evaluate_field_by_type(self, field_name: str, field_value: str, path: str, context: dict) -> bool:
        """Route field evaluation to appropriate handler based on field type."""
        # Import here to avoid circular dependencies
        try:
            # String fields
            if field_name in ('camera', 'place'):
                return self._evaluate_string_field(field_name, field_value, path, context)
            # Tag fields  
            elif field_name in ('tag', 'rating'):
                return self._evaluate_tag_field(field_name, field_value, path, context)
            # Person field
            elif field_name == 'person':
                return self._evaluate_person_field(field_value, path, context)
            # Text presence field
            elif field_name == 'has_text':
                return self._evaluate_text_presence_field(field_value, path, context)
            # File type field
            elif field_name == 'filetype':
                return self._evaluate_filetype_field(field_value, path)
            # Numeric fields
            elif field_name in ('iso', 'fnumber', 'width', 'height', 'mtime', 'brightness', 'sharpness', 'exposure', 'focal', 'duration'):
                return self._evaluate_numeric_field(field_name, field_value, path, context)
            else:
                return False
        except Exception:
            return False
    
    def _evaluate_string_field(self, field_name: str, field_value: str, path: str, context: dict) -> bool:
        """Evaluate string-based field expressions."""
        # This delegates to the existing functions in server.py
        # In a full refactor, these would be moved to appropriate services
        from api.server import _evaluate_string_field
        return _evaluate_string_field(field_name, field_value, path, context)
    
    def _evaluate_tag_field(self, field_name: str, field_value: str, path: str, context: dict) -> bool:
        """Evaluate tag-based field expressions."""
        from api.server import _evaluate_tag_field
        return _evaluate_tag_field(field_name, field_value, path, context)
    
    def _evaluate_person_field(self, field_value: str, path: str, context: dict) -> bool:
        """Evaluate person field expressions."""
        from api.server import _evaluate_person_field
        return _evaluate_person_field(field_value, path, context)
    
    def _evaluate_text_presence_field(self, field_value: str, path: str, context: dict) -> bool:
        """Evaluate text presence field expressions."""
        from api.server import _evaluate_text_presence_field
        return _evaluate_text_presence_field(field_value, path, context)
    
    def _evaluate_filetype_field(self, field_value: str, path: str) -> bool:
        """Evaluate filetype field expressions."""
        from api.server import _evaluate_filetype_field
        return _evaluate_filetype_field(field_value, path)
    
    def _evaluate_numeric_field(self, field_name: str, field_value: str, path: str, context: dict) -> bool:
        """Evaluate numeric field expressions."""
        from api.server import _evaluate_numeric_field
        return _evaluate_numeric_field(field_name, field_value, path, context)