// Debug boot logging
console.log('[Boot] Starting React app...');
window.addEventListener('error', (e) => {
  console.error('[Boot] Uncaught error:', e.error || e.message || e);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Boot] Unhandled promise rejection:', e.reason || e);
});
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/health-theme.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
