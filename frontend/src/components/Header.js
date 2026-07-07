'use client';
import { useEffect, useState } from 'react';

export default function Header() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Check if user has a preference saved, otherwise default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <header className="header">
      <div className="header-brand">
        <img src="/logo.svg" alt="Logo" className="header-logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
        <div>
          <div className="header-title">CRM</div>
          <div className="header-subtitle">AI-Powered CSV Importer</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Theme" title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="header-badge">AI ACTIVE</div>
      </div>
    </header>
  );
}
