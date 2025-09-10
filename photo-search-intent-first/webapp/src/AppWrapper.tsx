import React, { useState, useEffect } from 'react';
import ProUI from './components/ProUI';
import ModernApp from './components/ModernApp';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import './styles-modern.css';
import './styles-pro.css';

/**
 * AppWrapper component that allows switching between UIs
 * Set UI_MODE to control which UI to use
 */
const UI_MODE: 'pro' | 'modern' | 'classic' = 'pro'; // Use the new professional UI

const AppWrapper: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    // Check for saved preference or default to system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save preference
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleDarkModeToggle = () => {
    setDarkMode(prev => !prev);
  };

  if (UI_MODE === 'pro') {
    return (
      <ToastProvider>
        <ProUI 
          darkMode={darkMode}
          onDarkModeToggle={handleDarkModeToggle}
        />
      </ToastProvider>
    );
  }

  if (UI_MODE === 'modern') {
    return (
      <ToastProvider>
        <ModernApp 
          darkMode={darkMode}
          onDarkModeToggle={handleDarkModeToggle}
        />
      </ToastProvider>
    );
  }

  // Fall back to original App component
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
};

export default AppWrapper;