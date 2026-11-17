import React, { useState, useEffect } from 'react';
import { Notification, User } from '../../types';
import { db, subscribeToDb } from '../../services/db';
import {
  isDeviceNotificationSupported,
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  triggerDeviceNotification,
} from '../../services/deviceNotifications';
import { X, CheckCheck, Bell, ExternalLink, Smartphone, Send } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectPublication: (publicationId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectPublication,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getDeviceNotificationPermission()
  );
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const update = () => {
      setNotifications(db.getNotifications(currentUser.id));
    };
    update();
    const unsubDb = subscribeToDb(update);
    setPermission(getDeviceNotificationPermission());

    return () => {
      unsubDb();
    };
  }, [currentUser?.id, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleEnableDeviceAlerts = async () => {
    const granted = await requestDeviceNotificationPermission();
    setPermission(getDeviceNotificationPermission());
    if (granted) {
      setTestStatus('Device push alerts enabled! Sending a welcome alert...');
      await triggerDeviceNotification(
        'BRAIN HUB Device Alerts Active',
        `You will now receive instant alerts for ${currentUser.email} on this device.`
      );
    } else {
      setTestStatus('Browser notification permission was denied or dismissed.');
    }
  };

  const handleSendTestAlert = async () => {
    const ok = await triggerDeviceNotification(
      'BRAIN HUB Test Notification',
      'Real-time alerts are active for your published papers and account updates.'
    );
    setTestStatus(
      ok
        ? 'Test notification delivered to your device!'
        : 'Could not show browser notification. Check your browser notification permissions.'
    );
  };

  const handleMarkAllRead = () => {
    db.markAllNotificationsRead(currentUser.id);
  };

  const handleItemClick = (n: Notification) => {
    if (!n.isRead) {
      db.markNotificationRead(n.id);
    }
    if (n.relatedPublicationId) {
      onSelectPublication(n.relatedPublicationId);
      onClose();
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex sm:pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col pt-safe pb-safe">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#6D28D9]" />
              <h3 className="text-sm font-bold text-[#1E1B4B]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#F97316] text-white rounded-full tabular-nums">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="min-h-[44px] px-2 text-[11px] font-medium text-[#6D28D9] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Native Device Notifications Banner */}
          {isDeviceNotificationSupported() && (
            <div className="p-3 bg-purple-50/60 border-b border-purple-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#6D28D9]" />
                  Device Push Notifications
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    permission === 'granted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {permission === 'granted' ? 'ENABLED' : 'OPTIONAL'}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-snug">
                {permission === 'granted'
                  ? `Real-time alerts for ${currentUser.email} will notify directly on this device.`
                  : 'Enable browser/app alerts to get notified instantly when your papers are published or moderated.'}
              </p>

              {testStatus && (
                <div className="p-2 bg-white rounded border border-purple-200 text-[11px] text-purple-900 font-medium">
                  {testStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-0.5">
                {permission === 'granted' ? (
                  <button
                    type="button"
                    onClick={handleSendTestAlert}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    Send Test Alert
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnableDeviceAlerts}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Bell className="w-3 h-3" />
                    Enable Device Alerts
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Updates on your published papers and account activity will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-4 transition-colors hover:bg-slate-50 cursor-pointer ${
                    !n.isRead ? 'bg-purple-50/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#F97316] shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {n.relatedPublicationId && (
                      <span className="text-[#6D28D9] font-medium flex items-center gap-1">
                        View Paper <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
