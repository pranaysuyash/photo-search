const LOOPBACK_PROTOCOL = "http";
const LOOPBACK_HOST = "127.0.0.1";
const LOOPBACK_PORT = "8000";
const DEFAULT_BACKEND_BASE = `${LOOPBACK_PROTOCOL}://${LOOPBACK_HOST}:${LOOPBACK_PORT}`;
const DOCS_ENDPOINT = `${DEFAULT_BACKEND_BASE}/docs`;

// Simple test to verify frontend can connect to backend
async function testConnection() {
  try {
    console.log("Testing connection to backend...");

    // Test basic connectivity
    const response = await fetch(DOCS_ENDPOINT);
    console.log("Docs endpoint response:", response.status);

    if (response.ok) {
      console.log("✓ Successfully connected to backend API");
    } else {
      console.log("✗ Failed to connect to backend API");
      return;
    }

    // Test API base configuration
    const API_BASE = DEFAULT_BACKEND_BASE;
    console.log("API Base:", API_BASE);

    // Test a simple endpoint
    try {
      const healthResponse = await fetch(`${API_BASE}/health`);
      console.log("Health check response:", healthResponse.status);
    } catch (error) {
      console.log(
        "Health check failed (might be expected):",
        (error as Error).message
      );
    }

    console.log("Connection test completed");
  } catch (error) {
    console.error("Connection test failed:", error);
  }
}

// Run the test
testConnection();
