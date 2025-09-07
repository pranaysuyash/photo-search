#!/bin/bash

# OpenRouter setup for qwen in photo-search project
export OPENAI_API_KEY="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"
export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
export OPENAI_MODEL="openrouter/sonoma-dusk-alpha"

echo "Environment variables set:"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:20}..."
echo "OPENAI_BASE_URL: $OPENAI_BASE_URL"
echo "OPENAI_MODEL: $OPENAI_MODEL"

# Test the configuration
echo "Testing qwen configuration..."
