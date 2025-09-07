import React, { useState, useEffect } from 'react';
import ProUI from './components/ProUI';
import ModernApp from './components/ModernApp';
import App from './App';
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
      <ProUI 
        darkMode={darkMode}
        onDarkModeToggle={handleDarkModeToggle}
      />
    );
  }

  if (UI_MODE === 'modern') {
    return (
      <ModernApp 
        darkMode={darkMode}
        onDarkModeToggle={handleDarkModeToggle}
      />
    );
  }

  // Fall back to original App component
  return <App />;
};

export default AppWrapper;