import React, { useState, useEffect } from 'react';
import { Notification, User } from '../../types';
import { db, subscribeToDb } from '../../services/db';
import { isGoogleConnected, signInWithGoogle, subscribeToGoogleAuth } from '../../services/googleAuth';
import { sendGmailNotification } from '../../services/gmail';
import { X, CheckCheck, Bell, ExternalLink, Calendar, CheckCircle2, AlertTriangle, FileText, Mail, Send, Smartphone } from 'lucide-react';

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
  const [gmailConnected, setGmailConnected] = useState<boolean>(isGoogleConnected());
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [showTestConfirm, setShowTestConfirm] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const update = () => {
      setNotifications(db.getNotifications(currentUser.id));
    };
    update();
    const unsubDb = subscribeToDb(update);
    const unsubGoogle = subscribeToGoogleAuth((connected) => {
      setGmailConnected(connected);
    });

    return () => {
      unsubDb();
      unsubGoogle();
    };
  }, [currentUser?.id]);

  if (!isOpen || !currentUser) return null;

  const handleSendTestNotification = async () => {
    setShowTestConfirm(false);
    setSendingTest(true);
    setTestStatus(null);

    const res = await sendGmailNotification({
      toEmail: currentUser.email,
      recipientName: `${currentUser.firstName} ${currentUser.lastName}`,
      subject: `[BRAIN HUB] Device Notification Test`,
      headerTitle: 'Device Notification Test Alert',
      bodyContent: 'This is a real-time verification email sent via BRAIN HUB Gmail integration to verify that notifications arrive on your devices. All upcoming research updates and editorial review decisions will be delivered directly to your inbox.',
    });

    setSendingTest(false);
    if (res.success) {
      setTestStatus('Test alert dispatched to your Gmail! Check your device notifications.');
    } else {
      setTestStatus(`Failed: ${res.error}`);
    }
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
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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
                  className="text-[11px] font-medium text-[#6D28D9] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Gmail Device Sync Integration Banner */}
          <div className="p-3 bg-purple-50/60 border-b border-purple-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${gmailConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#6D28D9]" />
                  Gmail Device Alerts
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${gmailConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {gmailConnected ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-snug">
              {gmailConnected
                ? `Notifications for "${currentUser.email}" will alert directly to your phone & devices.`
                : 'Connect your Gmail account to receive mobile push & inbox alerts whenever papers are submitted or reviewed.'}
            </p>

            {testStatus && (
              <div className="p-2 bg-white rounded border border-purple-200 text-[11px] text-purple-900 font-medium">
                {testStatus}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-0.5">
              {gmailConnected ? (
                <button
                  type="button"
                  onClick={() => setShowTestConfirm(true)}
                  disabled={sendingTest}
                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded transition-all cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  {sendingTest ? 'Sending...' : 'Send Test Alert to Device'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Mail className="w-3 h-3" />
                  Connect Gmail for Device Alerts
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Updates on publication status reviews will appear here.
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

          {/* Test Alert Confirmation Modal */}
          {showTestConfirm && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-[#6D28D9] flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold">Send Test Device Alert?</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This will dispatch an official verification email via your connected Gmail to <strong className="text-slate-900">{currentUser.email}</strong> to verify that notifications reach your device.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTestConfirm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Send Test Alert
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
