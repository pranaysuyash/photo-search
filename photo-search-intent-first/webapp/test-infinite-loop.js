// Simple test to monitor for infinite loop behavior
// This would run in the browser console

console.log("🧪 Testing for infinite loop...");

// Track API calls
let apiCallCount = 0;
const originalFetch = window.fetch;
window.fetch = function (...args) {
	const url = args[0];
	if (url.includes("/library?")) {
		apiCallCount++;
		console.log(`📡 API call #${apiCallCount}: ${url}`);

		// Alert if we see too many rapid calls (indicating infinite loop)
		if (apiCallCount > 10) {
			console.error("🚨 INFINITE LOOP DETECTED: Too many library API calls!");
		}
	}
	return originalFetch.apply(this, args);
};

// Track React re-renders
let renderCount = 0;
const originalLog = console.log;
console.log = function (...args) {
	if (args[0]?.includes("PHOTO STORE:")) {
		renderCount++;
		console.log(`🔄 Render #${renderCount}:`, ...args);

		if (renderCount > 50) {
			console.error("🚨 INFINITE LOOP DETECTED: Too many store updates!");
		}
	}
	return originalLog.apply(this, args);
};

console.log("✅ Testing setup complete. Monitoring for infinite loops...");
