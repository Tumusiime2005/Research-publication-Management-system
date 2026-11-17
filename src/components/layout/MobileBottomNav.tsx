import React from 'react';
import { User } from '../../types';
import { BookOpen, FileText, PlusCircle, Bell, LogIn } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: 'public' | 'researcher';
  currentUser: User | null;
  unreadCount: number;
  onNavigate: (view: 'public' | 'researcher') => void;
  onOpenNewPublication: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  currentUser,
  unreadCount,
  onNavigate,
  onOpenNewPublication,
  onOpenNotifications,
  onOpenAuth,
}) => {
  return (
    <nav
      aria-label="Mobile App Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_20px_rgba(15,23,42,0.05)]"
    >
      <div className="grid grid-cols-4 items-center h-14 px-1">
        <button
          type="button"
          onClick={() => onNavigate('public')}
          className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl transition-colors active:scale-95 cursor-pointer ${
            currentView === 'public'
              ? 'text-[#6D28D9]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
            Explore
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenNewPublication}
          className="min-h-[44px] flex flex-col items-center justify-center rounded-xl text-[#6D28D9] hover:bg-purple-50/70 transition-colors active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] font-bold tracking-tight mt-0.5 whitespace-nowrap">
            Publish
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('researcher')}
          className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl transition-colors active:scale-95 cursor-pointer ${
            currentView === 'researcher'
              ? 'text-[#6D28D9]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
            My Work
          </span>
        </button>

        {currentUser ? (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative min-h-[44px] flex flex-col items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 transition-colors active:scale-95 cursor-pointer"
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 bg-[#F97316] text-white text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
              Alerts
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="min-h-[44px] flex flex-col items-center justify-center rounded-xl text-slate-500 hover:text-[#6D28D9] transition-colors active:scale-95 cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
              Sign In
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
