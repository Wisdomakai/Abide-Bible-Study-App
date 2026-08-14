import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
// The Android app now loads this site over the network rather than files baked
// into the APK, so it needs the service worker too — that cache is what keeps
// it working offline after the first launch. It used to be skipped in native
// because the assets were bundled and a worker had nothing to add.
if ('serviceWorker' in navigator) {
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
