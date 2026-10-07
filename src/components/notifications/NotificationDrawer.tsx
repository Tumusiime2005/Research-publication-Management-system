import React, { useState, useEffect } from 'react';
import { Notification, User } from '../../types';
import { db, subscribeToDb } from '../../services/db';
import { X, CheckCheck, Bell, ExternalLink, Calendar, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

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

  useEffect(() => {
    if (!currentUser) return;
    const update = () => {
      setNotifications(db.getNotifications(currentUser.id));
    };
    update();
    return subscribeToDb(update);
  }, [currentUser?.id]);

  if (!isOpen || !currentUser) return null;

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
        </div>
      </div>
    </div>
  );
};
