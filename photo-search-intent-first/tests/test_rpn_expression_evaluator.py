"""Tests for the RPNExpressionEvaluator service."""
import pytest
from unittest.mock import patch, Mock

from services.rpn_expression_evaluator import RPNExpressionEvaluator, StackOperator


def test_stack_operator_constants():
    """Test that stack operator constants are defined correctly."""
    assert StackOperator.NOT == "NOT"
    assert StackOperator.AND == "AND"
    assert StackOperator.OR == "OR"


def test_rpn_evaluator_initialization():
    """Test that RPNExpressionEvaluator initializes correctly."""
    evaluator = RPNExpressionEvaluator()
    assert evaluator is not None


def test_is_operator():
    """Test operator detection."""
    evaluator = RPNExpressionEvaluator()
    
    assert evaluator._is_operator("NOT") is True
    assert evaluator._is_operator("not") is True
    assert evaluator._is_operator("AND") is True
    assert evaluator._is_operator("and") is True
    assert evaluator._is_operator("OR") is True
    assert evaluator._is_operator("or") is True
    assert evaluator._is_operator("field:value") is False
    assert evaluator._is_operator("test") is False


def test_process_not_operator():
    """Test NOT operator processing."""
    evaluator = RPNExpressionEvaluator()
    
    # NOT with True value
    stack = [True]
    result = evaluator._process_not_operator(stack)
    assert result is False
    
    # NOT with False value
    stack = [False]
    result = evaluator._process_not_operator(stack)
    assert result is True
    
    # NOT with empty stack
    stack = []
    result = evaluator._process_not_operator(stack)
    assert result is True  # not False = True


def test_process_binary_operator():
    """Test AND/OR operator processing."""
    evaluator = RPNExpressionEvaluator()
    
    # AND operations
    assert evaluator._process_binary_operator("AND", [True, True]) is True
    assert evaluator._process_binary_operator("AND", [True, False]) is False
    assert evaluator._process_binary_operator("AND", [False, True]) is False
    assert evaluator._process_binary_operator("AND", [False, False]) is False
    
    # OR operations
    assert evaluator._process_binary_operator("OR", [True, True]) is True
    assert evaluator._process_binary_operator("OR", [True, False]) is True
    assert evaluator._process_binary_operator("OR", [False, True]) is True
    assert evaluator._process_binary_operator("OR", [False, False]) is False
    
    # Empty stack handling
    assert evaluator._process_binary_operator("AND", []) is False
    assert evaluator._process_binary_operator("OR", []) is False


def test_evaluate_simple_text_search():
    """Test simple text search evaluation."""
    evaluator = RPNExpressionEvaluator()
    
    context = {
        'cap_map': {'/test/photo.jpg': 'sunny beach'},
        'texts_map': {'/test/photo.jpg': 'vacation photos'}
    }
    
    # Text found in caption
    assert evaluator._evaluate_simple_text_search("beach", "/test/photo.jpg", context) is True
    
    # Text found in OCR
    assert evaluator._evaluate_simple_text_search("vacation", "/test/photo.jpg", context) is True
    
    # Text found in filename
    assert evaluator._evaluate_simple_text_search("photo", "/test/photo.jpg", context) is True
    
    # Text not found
    assert evaluator._evaluate_simple_text_search("mountain", "/test/photo.jpg", context) is False


def test_get_document_text():
    """Test document text compilation."""
    evaluator = RPNExpressionEvaluator()
    
    context = {
        'cap_map': {'/test/photo.jpg': 'Caption Text'},
        'texts_map': {'/test/photo.jpg': 'OCR Text'}
    }
    
    document_text = evaluator._get_document_text("/test/photo.jpg", context)
    
    assert "caption text" in document_text  # lowercase
    assert "ocr text" in document_text
    assert "photo.jpg" in document_text


def test_evaluate_expression_empty():
    """Test evaluating empty expression."""
    evaluator = RPNExpressionEvaluator()
    
    result = evaluator.evaluate_expression([], "/test/photo.jpg", {})
    assert result is True


def test_evaluate_expression_simple():
    """Test evaluating simple expression without operators."""
    evaluator = RPNExpressionEvaluator()
    
    context = {'cap_map': {'/test/photo.jpg': 'beach'}, 'texts_map': {}}
    
    # Single term that matches
    result = evaluator.evaluate_expression(["beach"], "/test/photo.jpg", context)
    assert result is True
    
    # Single term that doesn't match
    result = evaluator.evaluate_expression(["mountain"], "/test/photo.jpg", context)
    assert result is False


def test_evaluate_expression_with_not():
    """Test evaluating expression with NOT operator."""
    evaluator = RPNExpressionEvaluator()
    
    context = {'cap_map': {'/test/photo.jpg': 'beach'}, 'texts_map': {}}
    
    # NOT beach (should be False since beach matches)
    result = evaluator.evaluate_expression(["beach", "NOT"], "/test/photo.jpg", context)
    assert result is False
    
    # NOT mountain (should be True since mountain doesn't match)
    result = evaluator.evaluate_expression(["mountain", "NOT"], "/test/photo.jpg", context)
    assert result is True


def test_evaluate_expression_with_and():
    """Test evaluating expression with AND operator."""
    evaluator = RPNExpressionEvaluator()
    
    context = {
        'cap_map': {'/test/photo.jpg': 'sunny beach vacation'},
        'texts_map': {}
    }
    
    # beach AND sunny (both match)
    result = evaluator.evaluate_expression(["beach", "sunny", "AND"], "/test/photo.jpg", context)
    assert result is True
    
    # beach AND mountain (only beach matches)
    result = evaluator.evaluate_expression(["beach", "mountain", "AND"], "/test/photo.jpg", context)
    assert result is False


def test_evaluate_expression_with_or():
    """Test evaluating expression with OR operator."""
    evaluator = RPNExpressionEvaluator()
    
    context = {
        'cap_map': {'/test/photo.jpg': 'sunny beach'},
        'texts_map': {}
    }
    
    # beach OR mountain (beach matches)
    result = evaluator.evaluate_expression(["beach", "mountain", "OR"], "/test/photo.jpg", context)
    assert result is True
    
    # city OR mountain (neither matches)
    result = evaluator.evaluate_expression(["city", "mountain", "OR"], "/test/photo.jpg", context)
    assert result is False


@patch('services.rpn_expression_evaluator.RPNExpressionEvaluator._evaluate_string_field')
def test_evaluate_field_by_type_string(mock_string_field):
    """Test field evaluation routing for string fields."""
    evaluator = RPNExpressionEvaluator()
    mock_string_field.return_value = True
    
    result = evaluator._evaluate_field_by_type("camera", "canon", "/test/photo.jpg", {})
    
    assert result is True
    mock_string_field.assert_called_once_with("camera", "canon", "/test/photo.jpg", {})


@patch('services.rpn_expression_evaluator.RPNExpressionEvaluator._evaluate_numeric_field')
def test_evaluate_field_by_type_numeric(mock_numeric_field):
    """Test field evaluation routing for numeric fields."""
    evaluator = RPNExpressionEvaluator()
    mock_numeric_field.return_value = True
    
    result = evaluator._evaluate_field_by_type("iso", "100", "/test/photo.jpg", {})
    
    assert result is True
    mock_numeric_field.assert_called_once_with("iso", "100", "/test/photo.jpg", {})


def test_evaluate_field_expression_with_colon():
    """Test field expression parsing with colon separator."""
    evaluator = RPNExpressionEvaluator()
    
    with patch.object(evaluator, '_evaluate_field_by_type', return_value=True) as mock_eval:
        result = evaluator._evaluate_field_expression("camera:canon", "/test/photo.jpg", {})
        
        assert result is True
        mock_eval.assert_called_once_with("camera", "canon", "/test/photo.jpg", {})


def test_evaluate_field_expression_without_colon():
    """Test field expression parsing without colon (simple text search)."""
    evaluator = RPNExpressionEvaluator()
    
    with patch.object(evaluator, '_evaluate_simple_text_search', return_value=True) as mock_eval:
        result = evaluator._evaluate_field_expression("beach", "/test/photo.jpg", {})
        
        assert result is True
        mock_eval.assert_called_once_with("beach", "/test/photo.jpg", {})


def test_complex_expression():
    """Test complex RPN expression evaluation."""
    evaluator = RPNExpressionEvaluator()
    
    context = {
        'cap_map': {'/test/photo.jpg': 'sunny beach vacation'},
        'texts_map': {}
    }
    
    # (beach AND sunny) OR mountain
    # RPN: beach sunny AND mountain OR
    result = evaluator.evaluate_expression(
        ["beach", "sunny", "AND", "mountain", "OR"], 
        "/test/photo.jpg", 
        context
    )
    assert result is True  # beach AND sunny = True, True OR False = True


if __name__ == "__main__":
    pytest.main([__file__])