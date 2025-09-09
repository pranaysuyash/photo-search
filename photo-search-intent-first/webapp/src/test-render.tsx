// Simple test to check if App component renders
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SimpleStoreProvider } from './stores/SimpleStore';

// Create a simple test container
const container = document.createElement('div');
container.id = 'root';
document.body.appendChild(container);

// Try to render the App component
try {
  const root = createRoot(container);
  root.render(
    <SimpleStoreProvider>
      <App />
    </SimpleStoreProvider>
  );
  console.log('✓ App component rendered successfully');
} catch (error) {
  console.error('✗ App component failed to render:', error);
}

// Check if required DOM elements are present
setTimeout(() => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    console.log('✓ Root element found');
    console.log('Root element children:', rootElement.children.length);
  } else {
    console.log('✗ Root element not found');
  }
  
  // Check for specific elements that should be in the App
  const sidebar = document.querySelector('.w-64');
  if (sidebar) {
    console.log('✓ Sidebar element found');
  } else {
    console.log('✗ Sidebar element not found');
  }
  
  const topbar = document.querySelector('.border-b');
  if (topbar) {
    console.log('✓ Topbar element found');
  } else {
    console.log('✗ Topbar element not found');
  }
}, 100);