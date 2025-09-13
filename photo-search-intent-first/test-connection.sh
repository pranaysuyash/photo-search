#!/bin/bash

# Test script to verify webapp and API connectivity

echo "=== Photo Search Webapp Connection Test ==="
echo ""

# Test 1: Check if frontend is running
echo "1. Testing frontend server (port 5173)..."
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend server is running on port 5173"
else
    echo "❌ Frontend server is not responding on port 5173"
fi

# Test 2: Check if backend API is running
echo ""
echo "2. Testing backend API (port 8000)..."
API_RESPONSE=$(curl -s http://localhost:8000/api/ping)
if [ "$API_RESPONSE" = '{"ok":true}' ]; then
    echo "✅ Backend API is running and responding correctly"
else
    echo "❌ Backend API is not responding properly"
    echo "   Response: $API_RESPONSE"
fi

# Test 3: Check auth status
echo ""
echo "3. Testing auth status endpoint..."
AUTH_RESPONSE=$(curl -s http://localhost:8000/auth/status)
if echo "$AUTH_RESPONSE" | grep -q "auth_required"; then
    echo "✅ Auth status endpoint is working"
else
    echo "❌ Auth status endpoint is not responding properly"
    echo "   Response: $AUTH_RESPONSE"
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "If both servers are running, you can access the webapp at:"
echo "http://localhost:5173"
echo ""
echo "The webapp should now be able to connect to the backend API."