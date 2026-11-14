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

createRoot(document.getElementById('root')!).render(
  isSeparateAdminPortal ? <AdminPortalApp /> : <App />
);
