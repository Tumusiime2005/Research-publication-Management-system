import React, { useState, useEffect } from 'react';
import { User, Notification } from '../../types';
import { authService, subscribeToAuth } from '../../services/auth';
import { db, subscribeToDb } from '../../services/db';
import { isGoogleConnected, signOutGoogle, signInWithGoogle, subscribeToGoogleAuth } from '../../services/googleAuth';
import { Bell, BookOpen, ShieldCheck, FileText, LogOut, UserCircle, Plus, Mail } from 'lucide-react';

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
  const [gmailActive, setGmailActive] = useState<boolean>(isGoogleConnected());

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
    const unsubGoogle = subscribeToGoogleAuth((connected) => {
      setGmailActive(connected);
    });

    if (currentUser) {
      const notifs = db.getNotifications(currentUser.id);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    }

    return () => {
      unsubAuth();
      unsubDb();
      unsubGoogle();
    };
  }, [currentUser?.id]);

  const handleLogout = () => {
    signOutGoogle();
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
                  {currentUser.profilePhotoUrl ? (
                    <img
                      src={currentUser.profilePhotoUrl}
                      alt={currentUser.firstName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#B0D9F2]/40 text-[#1E1B4B] flex items-center justify-center font-bold text-xs border border-slate-200">
                      {currentUser.firstName[0]}
                      {currentUser.lastName[0]}
                    </div>
                  )}
                  <div className="hidden xl:block text-xs">
                    <p className="font-semibold text-slate-800 leading-tight">
                      {currentUser.firstName} {currentUser.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      {currentUser.role}
                      {gmailActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Gmail Device Alerts Active" />
                      )}
                    </p>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.firstName} {currentUser.lastName}
                        </p>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-50 text-[#6D28D9]">
                          {currentUser.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {currentUser.institution}
                      </p>

                      {/* Gmail Device Sync Status */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                          <span className={`w-2 h-2 rounded-full ${gmailActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          Gmail Device Alerts
                        </span>
                        {gmailActive ? (
                          <span className="text-emerald-700 font-bold">Active</span>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await signInWithGoogle();
                                setUserDropdownOpen(false);
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="text-[#6D28D9] font-bold hover:underline cursor-pointer"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      {currentUser.role === 'RESEARCHER' && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('researcher');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
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
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          Administrator Console
                        </button>
                      )}
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
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch (e) {
                    onOpenAuth('login');
                  }
                }}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Google Sign-In</span>
              </button>
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
