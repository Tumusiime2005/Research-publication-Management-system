import React, { useState, useEffect } from 'react';
import { User, Publication, StoredUser } from './types';
import { authService, subscribeToAdminAuth } from './services/auth';
import { db, subscribeToDb } from './services/db';
import { initFirestoreSync } from './services/firestoreSync';
import { AdminDashboard, AdminTab } from './components/admin/AdminDashboard';
import { PublicationDetailModal } from './components/public/PublicationDetailModal';
import { AuditLogViewerModal } from './components/admin/AuditLogViewerModal';
import { Footer } from './components/layout/Footer';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { ShieldCheck, Lock, Mail, AlertCircle, LogOut, ExternalLink, Copy, Check, Users, FileText, Shield, History } from 'lucide-react';

export default function AdminPortalApp() {
  const [adminUser, setAdminUser] = useState<User | null>(authService.getCurrentAdmin());
  const [publications, setPublications] = useState<Publication[]>(db.getPublications());
  const [users, setUsers] = useState<StoredUser[]>(db.getUsers());

  // Admin Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals & Navigation
  const [activeTab, setActiveTab] = useState<AdminTab>('accounts');
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyAdminUrl = () => {
    const adminUrl = `${window.location.origin}/admin`;
    navigator.clipboard.writeText(adminUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  useEffect(() => {
    document.title = 'BRAIN HUB - Separate Admin Control Center';

    const unsubAdmin = subscribeToAdminAuth((u) => setAdminUser(u));
    const unsubDb = subscribeToDb(() => {
      setPublications(db.getPublications());
      setUsers(db.getUsers());
    });

    const unsubFirestore = initFirestoreSync(
      (cloudPubs, authoritative) => {
        db.setExternalPublications(cloudPubs, authoritative);
        setPublications(db.getPublications());
      },
      (cloudUsers, authoritative) => {
        db.setExternalUsers(cloudUsers, authoritative);
        setUsers(db.getUsers());
        authService.syncActiveSessionsWithDb();
      },
      (cloudNotifs, authoritative) => {
        db.setExternalNotifications(cloudNotifs, authoritative);
      }
    );

    return () => {
      unsubAdmin();
      unsubDb();
      unsubFirestore();
    };
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    const res = authService.loginAdmin(email, password);
    setLoading(false);
    if (!res.success) {
      setLoginError(res.error || 'Invalid administrator credentials.');
    }
  };

  const handleRefresh = () => {
    setPublications(db.getPublications());
    setUsers(db.getUsers());
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E1B4B]">
      {/* Standalone Admin Header */}
      <header className="sticky top-0 z-30 bg-[#1E1B4B] text-white border-b border-purple-900/40 shadow-sm pt-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/assets/aistudio/image_c3fb1387_fb406a7b.jpg"
              alt="BRAIN HUB"
              className="h-8 md:h-9 w-auto object-contain rounded bg-white p-0.5 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-tight truncate">BRAIN HUB</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#6D28D9] text-white uppercase shrink-0">
                  Admin
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-[#B0D9F2] truncate">
                Registered Accounts Directory & Repository Moderation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <PWAInstallButton label="Install Admin App" mobileLabel="Get App" variant="dark" />

            <button
              type="button"
              onClick={handleCopyAdminUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/90 hover:text-white bg-purple-900/60 hover:bg-purple-800/70 border border-purple-700/60 rounded-md transition-colors cursor-pointer"
              title="Copy direct Admin Dashboard URL to bookmark or save"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copiedLink ? 'Link Copied!' : 'Copy Admin Link'}</span>
            </button>

            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B0D9F2] hover:text-white border border-purple-700/60 hover:border-purple-500 rounded-md transition-colors"
            >
              <span className="hidden sm:inline">User Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {adminUser && (
              <button
                onClick={() => authService.logoutAdmin()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600/90 hover:bg-rose-600 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {!adminUser ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-[#1E1B4B]">
                    Administrator Sign In
                  </h1>
                  <p className="text-xs text-slate-500">
                    Restricted portal for BRAIN HUB system administrators
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tumusiimeeltonmarvin@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrator Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Access Admin Dashboard'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <AdminDashboard
            currentUser={adminUser}
            publications={publications}
            users={users}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onInspectPublication={(pub) => setSelectedPublication(pub)}
            onViewAuditLogs={() => setAuditModalOpen(true)}
            onRefresh={handleRefresh}
          />
        )}
      </main>

      <Footer />

      {adminUser && (
        <nav
          aria-label="Mobile Admin Navigation"
          className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#1E1B4B]/95 backdrop-blur-md border-t border-purple-900/60 pb-safe shadow-[0_-4px_20px_rgba(15,23,42,0.18)]"
        >
          <div className="grid grid-cols-4 items-center h-14 px-1">
            {[
              { id: 'accounts' as const, label: 'Accounts', icon: Users },
              { id: 'papers' as const, label: 'Papers', icon: FileText },
              { id: 'admins' as const, label: 'Security', icon: Shield },
              { id: 'audit' as const, label: 'Audit', icon: History },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl transition-colors active:scale-95 cursor-pointer ${
                    isActive ? 'text-[#B0D9F2]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <OfflineIndicator />

      <PublicationDetailModal
        publication={selectedPublication}
        onClose={() => setSelectedPublication(null)}
      />

      <AuditLogViewerModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />
    </div>
  );
}
