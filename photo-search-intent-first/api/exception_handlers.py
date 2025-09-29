"""
Global exception handlers for the photo search API.

This module provides centralized exception handling to ensure consistent
error responses across all endpoints in the application.
"""
from typing import Dict, Any
from fastapi import Request, HTTPException
from fastapi.exception_handlers import http_exception_handler as fastapi_http_exception_handler
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from api.schemas.v1 import ErrorResponse


async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Custom HTTP exception handler that provides consistent error responses.
    
    Args:
        request: The incoming request
        exc: The HTTP exception that was raised
        
    Returns:
        A JSON response with consistent error format
    """
    error_response = ErrorResponse(
        ok=False,
        error={
            "type": "http_exception",
            "status_code": exc.status_code,
            "message": exc.detail
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.dict()
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handler for request validation errors.
    
    Args:
        request: The incoming request
        exc: The validation error that was raised
        
    Returns:
        A JSON response with validation error details
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "loc": error["loc"],
            "type": error["type"],
            "message": error["msg"],
        })
    
    error_response = ErrorResponse(
        ok=False,
        error={
            "type": "validation_error",
            "message": "Request validation failed",
            "details": errors
        }
    )
    return JSONResponse(
        status_code=422,
        content=error_response.dict()
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    General exception handler for unexpected errors.
    
    Args:
        request: The incoming request
        exc: The exception that was raised
        
    Returns:
        A JSON response with error details
    """
    # For security, don't expose internal error details in production
    error_detail = "Internal server error" if not getattr(request.app.state, 'debug', False) else str(exc)
    
    error_response = ErrorResponse(
        ok=False,
        error={
            "type": "internal_error",
            "message": error_detail
        }
    )
    return JSONResponse(
        status_code=500,
        content=error_response.dict()
    )