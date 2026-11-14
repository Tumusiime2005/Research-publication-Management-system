import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { authService, subscribeToAuth } from '../../services/auth';
import { db, subscribeToDb } from '../../services/db';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { Bell, BookOpen, FileText, LogOut, Plus, CheckCircle2, Clock } from 'lucide-react';

interface HeaderProps {
  currentView: 'public' | 'researcher';
  onNavigate: (view: 'public' | 'researcher') => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onOpenNewPublication: () => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenNewPublication,
  onOpenNotifications,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const unsubAuth = subscribeToAuth((u) => setCurrentUser(u));
    const unsubDb = subscribeToDb(() => {
      const u = authService.getCurrentUser();
      setCurrentUser(u);
      if (u) {
        const notifs = db.getNotifications(u.id);
        setUnreadCount(notifs.filter(n => !n.isRead).length);
      } else {
        setUnreadCount(0);
      }
    });

    if (currentUser) {
      const notifs = db.getNotifications(currentUser.id);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    }

    return () => {
      unsubAuth();
      unsubDb();
    };
  }, [currentUser?.id]);

  const handleLogout = () => {
    authService.logout();
    setUserDropdownOpen(false);
    onNavigate('public');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('public')}
            className="flex items-center gap-3 text-left group transition-opacity hover:opacity-90 cursor-pointer"
          >
            <img
              src="/assets/aistudio/image_c3fb1387_fb406a7b.jpg"
              alt="BRAIN HUB Logo"
              className="h-10 w-auto max-w-[200px] object-contain rounded"
            />
          </button>
        </div>

        {/* Zone 2: Navigation Links (User System Only — No Admin Entry Here) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('public')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              currentView === 'public'
                ? 'text-[#6D28D9] bg-purple-50/80 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Repository
            </span>
          </button>

          {currentUser && (
            <button
              onClick={() => onNavigate('researcher')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                currentView === 'researcher'
                  ? 'text-[#6D28D9] bg-purple-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                My Research
              </span>
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Actions + PWA Install Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton />

          {currentUser ? (
            <>
              <button
                onClick={onOpenNewPublication}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-all shadow-sm active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Publish Paper
              </button>

              {/* Notification Button */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#F97316] text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[#B0D9F2]/40 text-[#1E1B4B] flex items-center justify-center font-bold text-xs border border-slate-200">
                    {currentUser.firstName[0]}
                    {currentUser.lastName[0]}
                  </div>
                  <div className="hidden xl:block text-xs">
                    <p className="font-semibold text-slate-800 leading-tight">
                      {currentUser.firstName} {currentUser.lastName}
                    </p>
                    <p className="text-[11px] font-medium flex items-center gap-1">
                      {currentUser.accountStatus === 'ACTIVE' ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending Verification
                        </span>
                      )}
                    </p>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.firstName} {currentUser.lastName}
                        </p>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                            currentUser.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {currentUser.accountStatus === 'ACTIVE' ? 'VERIFIED' : currentUser.accountStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {currentUser.institution}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate('researcher');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        My Research Workspace
                      </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenNewPublication();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer sm:hidden"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                        Publish Paper
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                Join as Researcher
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
