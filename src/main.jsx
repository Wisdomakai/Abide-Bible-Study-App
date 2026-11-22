import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { isNativeApp } from './data/native';
// The native apps ship the built files inside the package, so a service
// worker has nothing to cache and would only pin stale assets across app
// updates. The website (and installed PWA) still uses it for offline support.
if ('serviceWorker' in navigator && !isNativeApp) {
  let refreshingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshingForUpdate) return;
    refreshingForUpdate = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => registration.update()).catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(<App />);
