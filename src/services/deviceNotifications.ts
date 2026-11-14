// Native Browser & PWA Device Notification Utility (no third-party OAuth required)

export function isDeviceNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getDeviceNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isDeviceNotificationSupported()) return 'unsupported';
  return window.Notification.permission;
}

export async function requestDeviceNotificationPermission(): Promise<boolean> {
  if (!isDeviceNotificationSupported()) return false;
  try {
    const perm = await window.Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

export async function triggerDeviceNotification(title: string, body: string): Promise<boolean> {
  if (!isDeviceNotificationSupported()) return false;
  if (window.Notification.permission !== 'granted') return false;

  try {
    // Prefer Service Worker registration notification for installed PWAs / mobile devices
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `brainhub-${Date.now()}`,
        });
        return true;
      }
    }

    // Fallback to standard Desktop/Browser Notification API
    new window.Notification(title, {
      body,
      icon: '/pwa-192x192.png',
    });
    return true;
  } catch (err) {
    console.warn('Device notification dispatch notice:', err);
    return false;
  }
}
