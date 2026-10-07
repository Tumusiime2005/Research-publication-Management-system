import React, { useState, useEffect } from 'react';
import { User, Notification } from '../../types';
import { authService, subscribeToAuth } from '../../services/auth';
import { db, subscribeToDb } from '../../services/db';
import { Bell, BookOpen, ShieldCheck, FileText, LogOut, UserCircle, Plus } from 'lucide-react';

interface HeaderProps {
  currentView: 'public' | 'researcher' | 'admin';
  onNavigate: (view: 'public' | 'researcher' | 'admin') => void;
  onOpenAuth: (initialMode?: 'login' | 'register' | 'bootstrap') => void;
  onOpenNewPublication: () => void;
  onOpenNotifications: () => void;
  onSelectPublication?: (id: string) => void;
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
            className="flex items-center gap-2.5 text-left group transition-opacity hover:opacity-90 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#6D28D9] flex items-center justify-center text-white font-bold text-base shadow-sm">
              BH
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#1E1B4B]">
              BRAIN HUB
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
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

          {currentUser?.role === 'RESEARCHER' && (
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

          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                currentView === 'admin'
                  ? 'text-[#6D28D9] bg-purple-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Editorial Queue
              </span>
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              {currentUser.role === 'RESEARCHER' && (
                <button
                  onClick={onOpenNewPublication}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-all shadow-sm active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  New Publication
                </button>
              )}

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
                    <p className="text-[11px] text-slate-500 font-medium">
                      {currentUser.role}
                    </p>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">
                        {currentUser.firstName} {currentUser.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        {currentUser.institution}
                      </p>
                      <div className="mt-1.5 inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-50 text-[#6D28D9]">
                        {currentUser.role}
                      </div>
                    </div>

                    <div className="py-1">
                      {currentUser.role === 'RESEARCHER' && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('researcher');
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          Researcher Workspace
                        </button>
                      )}
                      {currentUser.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('admin');
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          Administrator Console
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
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
              <button
                onClick={() => onOpenAuth('bootstrap')}
                className="hidden lg:inline-flex px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                title="Bootstrap System Administrator"
              >
                Admin Setup
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
