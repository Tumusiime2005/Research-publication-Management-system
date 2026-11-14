import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import AdminPortalApp from './AdminPortalApp.tsx';
import './index.css';

// Register Service Worker for browser installability & offline support
registerSW({ immediate: true });

// Route strictly between User System (/) and Separate Admin Dashboard (/admin)
const isSeparateAdminPortal =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/admin') ||
    window.location.hash.startsWith('#/admin') ||
    new URLSearchParams(window.location.search).get('portal') === 'admin');

if (isSeparateAdminPortal && typeof document !== 'undefined') {
  const existingManifest = document.querySelector('link[rel="manifest"]');
  if (existingManifest) {
    existingManifest.setAttribute('href', '/admin-manifest.webmanifest');
  } else {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/admin-manifest.webmanifest';
    document.head.appendChild(link);
  }
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) {
    appleTitle.setAttribute('content', 'BRAIN HUB Admin');
  }
}

createRoot(document.getElementById('root')!).render(
  isSeparateAdminPortal ? <AdminPortalApp /> : <App />
);
