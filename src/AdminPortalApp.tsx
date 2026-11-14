import React, { useState, useEffect } from 'react';
import { User, Publication, StoredUser } from './types';
import { authService, subscribeToAdminAuth } from './services/auth';
import { db, subscribeToDb } from './services/db';
import { initFirestoreSync } from './services/firestoreSync';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PublicationDetailModal } from './components/public/PublicationDetailModal';
import { AuditLogViewerModal } from './components/admin/AuditLogViewerModal';
import { Footer } from './components/layout/Footer';
import { ShieldCheck, Lock, Mail, AlertCircle, LogOut, ExternalLink } from 'lucide-react';

export default function AdminPortalApp() {
  const [adminUser, setAdminUser] = useState<User | null>(authService.getCurrentAdmin());
  const [publications, setPublications] = useState<Publication[]>(db.getPublications());
  const [users, setUsers] = useState<StoredUser[]>(db.getUsers());

  // Admin Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

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
      <header className="sticky top-0 z-30 bg-[#1E1B4B] text-white border-b border-purple-900/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/image_c3fb1387_fb406a7b.jpg"
              alt="BRAIN HUB"
              className="h-9 w-auto object-contain rounded bg-white p-0.5"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-tight">BRAIN HUB</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#6D28D9] text-white uppercase">
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-[#B0D9F2]">
                External Account Verification & Repository Moderation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B0D9F2] hover:text-white border border-purple-700/60 hover:border-purple-500 rounded-md transition-colors"
            >
              <span>Open User Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {adminUser && (
              <button
                onClick={() => authService.logoutAdmin()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600/90 hover:bg-rose-600 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
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
            onInspectPublication={(pub) => setSelectedPublication(pub)}
            onViewAuditLogs={() => setAuditModalOpen(true)}
            onRefresh={handleRefresh}
          />
        )}
      </main>

      <Footer />

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
