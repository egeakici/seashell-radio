import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Check for a new deploy as soon as the page loads and reload into it right away.
// Without this, the service worker keeps serving the previous build until a second reload.
// No periodic checks: an auto-reload mid-session would cut off the playing station.
registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
