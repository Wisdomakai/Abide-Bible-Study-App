import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { isNativeApp } from './data/native';

if (!isNativeApp && 'serviceWorker' in navigator) {
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
