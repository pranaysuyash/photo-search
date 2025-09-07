#!/bin/bash

# Functions to switch between qwen authentication methods

# Use OpenRouter
qwen-openrouter() {
    export OPENAI_API_KEY="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"
    export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
    export OPENAI_MODEL="openrouter/sonoma-dusk-alpha"
    
    # Update qwen settings to use OpenAI auth
    echo '{"selectedAuthType": "openai", "theme": "Qwen Dark", "preferredEditor": "cursor", "hasSeenIdeIntegrationNudge": true, "ideMode": true}' > ~/.qwen/settings.json
    
    echo "✅ Switched to OpenRouter authentication"
    echo "You can now use: qwen -p 'your prompt'"
}

# Use native qwen auth
qwen-native() {
    unset OPENAI_API_KEY OPENAI_BASE_URL OPENAI_MODEL
    
    # Update qwen settings to remove OpenAI auth
    echo '{"theme": "Qwen Dark", "preferredEditor": "cursor", "hasSeenIdeIntegrationNudge": true, "ideMode": true}' > ~/.qwen/settings.json
    
    echo "✅ Switched to native qwen authentication"
    echo "You can now use: qwen /auth to authenticate"
}

# Check current auth status
qwen-status() {
    echo "Current environment:"
    echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+set (${#OPENAI_API_KEY} chars)}"
    echo "OPENAI_BASE_URL: $OPENAI_BASE_URL"
    echo "OPENAI_MODEL: $OPENAI_MODEL"
    echo ""
    echo "qwen settings:"
    cat ~/.qwen/settings.json | jq . 2>/dev/null || cat ~/.qwen/settings.json
}
