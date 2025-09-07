import React, { useState, useEffect } from 'react';
import ModernApp from './components/ModernApp';
import App from './App';
import './styles-modern.css';

/**
 * AppWrapper component that allows switching between the old and new UI
 * Set USE_MODERN_UI to true to use the new modern components
 */
const USE_MODERN_UI = true; // Toggle this to switch between UIs

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

  if (USE_MODERN_UI) {
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