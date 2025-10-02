# services/expression_evaluator.py
from typing import List, Dict, Any
from abc import ABC, abstractmethod


class RPNToken(ABC):
    @abstractmethod
    def evaluate(self, stack: List[bool], path: str, context: Dict[str, Any]) -> None:
        pass


class LogicalOperatorToken(RPNToken):
    def __init__(self, operator: str):
        self.operator = operator.upper()
        
    def evaluate(self, stack: List[bool], path: str, context: Dict[str, Any]) -> None:
        if self.operator == 'NOT':
            value = stack.pop() if stack else False
            stack.append(not value)
        elif self.operator in ('AND', 'OR'):
            b = stack.pop() if stack else False
            a = stack.pop() if stack else False
            if self.operator == 'AND':
                stack.append(a and b)
            else:  # OR
                stack.append(a or b)


class FieldExpressionToken(RPNToken):
    def __init__(self, expression: str):
        self.expression = expression
        
    def evaluate(self, stack: List[bool], path: str, context: Dict[str, Any]) -> None:
        # Call the helper function to evaluate the field expression
        result = _evaluate_field_expression(self.expression, path, context)
        stack.append(result)


class RPNTokenFactory:
    @staticmethod
    def create_token(token_str: str) -> RPNToken:
        token_upper = token_str.upper()
        if token_upper in ('NOT', 'AND', 'OR'):
            return LogicalOperatorToken(token_upper)
        else:
            return FieldExpressionToken(token_str)


def _evaluate_field_expression(token: str, path: str, context: Dict[str, Any]) -> bool:
    """
    Evaluate a single field expression against a photo path.
    This replicates the logic from the original server's _evaluate_field_expression function.
    """
    def _get_document_text(pth: str) -> str:
        from pathlib import Path
        name = Path(pth).name
        # Get caption and OCR text if available in context
        cap_map = context.get('cap_map', {})
        texts_map = context.get('texts_map', {})
        caption_text = cap_map.get(pth, '')
        ocr_text = texts_map.get(pth, '')
        return f"{caption_text}\n{ocr_text}\n{name}".lower()
    
    # Simple text search (no field specified)
    if ':' not in token:
        return token.lower() in _get_document_text(path)
    
    try:
        field, value = token.split(':', 1)
        field_value = (value or '').strip().strip('"').strip("'")
        field_name = field.lower()
        
        # Handle different field types
        if field_name == 'text':
            # Text search in captions, OCR, or filename
            return field_value.lower() in _get_document_text(path)
        elif field_name == 'caption':
            # Search specifically in captions
            cap_map = context.get('cap_map', {})
            caption = cap_map.get(path, '').lower()
            return field_value.lower() in caption
        elif field_name == 'ocr':
            # Search specifically in OCR text
            texts_map = context.get('texts_map', {})
            ocr_text = texts_map.get(path, '').lower()
            return field_value.lower() in ocr_text
        elif field_name == 'name' or field_name == 'filename':
            # Search in filename only
            from pathlib import Path
            filename = Path(path).name.lower()
            return field_value.lower() in filename
        elif field_name == 'ext' or field_name == 'extension':
            # Search by file extension
            from pathlib import Path
            ext = Path(path).suffix.lower()
            return ext == f".{field_value.lower()}"
        elif field_name == 'size':
            # Size-based filtering (e.g., size:>1MB)
            import re
            size_match = re.match(r'([<>=]+)(\d+)([mgkMGK])', field_value)
            if size_match:
                op, num, unit = size_match.groups()
                try:
                    size_bytes = float(num)
                    # Convert to bytes based on unit
                    if unit.lower() == 'k':
                        size_bytes *= 1024
                    elif unit.lower() == 'm':
                        size_bytes *= 1024 ** 2
                    elif unit.lower() == 'g':
                        size_bytes *= 1024 ** 3
                    
                    # Get actual file size
                    actual_size = context.get('path_sizes', {}).get(path, 0)
                    if op == '>':
                        return actual_size > size_bytes
                    elif op == '<':
                        return actual_size < size_bytes
                    elif op == '>=':
                        return actual_size >= size_bytes
                    elif op == '<=':
                        return actual_size <= size_bytes
                    elif op == '=' or op == '==':
                        return actual_size == size_bytes
                except:
                    pass
            return False
        elif field_name == 'date':
            # Date-based filtering (e.g., date:>2022-01-01)
            import re
            from datetime import datetime
            date_match = re.match(r'([<>=]+)(\d{4}-\d{2}-\d{2})', field_value)
            if date_match:
                op, date_str = date_match.groups()
                try:
                    filter_date = datetime.strptime(date_str, '%Y-%m-%d').timestamp()
                    # Get file modification time from context
                    mod_time = context.get('path_dates', {}).get(path, 0)
                    if op == '>':
                        return mod_time > filter_date
                    elif op == '<':
                        return mod_time < filter_date
                    elif op == '>=':
                        return mod_time >= filter_date
                    elif op == '<=':
                        return mod_time <= filter_date
                    elif op == '=' or op == '==':
                        return mod_time == filter_date
                except:
                    pass
            return False
        else:
            # Unknown field - return False
            return False
    except:
        # If parsing fails, return False
        return False


class RPNExpressionEvaluator:
    def __init__(self):
        self.token_factory = RPNTokenFactory()
        
    def evaluate(self, rpn_output: List[str], path: str, context: Dict[str, Any]) -> bool:
        stack = []
        
        for token_str in rpn_output:
            token = self.token_factory.create_token(token_str)
            token.evaluate(stack, path, context)
            
        return bool(stack[-1]) if stack else True