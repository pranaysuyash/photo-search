// Simple test to verify frontend can connect to backend
async function testConnection() {
  try {
    console.log('Testing connection to backend...');
    
    // Test basic connectivity
    const response = await fetch('http://127.0.0.1:8000/docs');
    console.log('Docs endpoint response:', response.status);
    
    if (response.ok) {
      console.log('✓ Successfully connected to backend API');
    } else {
      console.log('✗ Failed to connect to backend API');
      return;
    }
    
    // Test API base configuration
    const API_BASE = 'http://127.0.0.1:8000';
    console.log('API Base:', API_BASE);
    
    // Test a simple endpoint
    try {
      const healthResponse = await fetch(`${API_BASE}/health`);
      console.log('Health check response:', healthResponse.status);
    } catch (error) {
      console.log('Health check failed (might be expected):', error.message);
    }
    
    console.log('Connection test completed');
  } catch (error) {
    console.error('Connection test failed:', error);
  }
}

// Run the test
testConnection();