import React, { useState, useMemo } from 'react';
import { Publication, User, StoredUser } from '../../types';
import { db } from '../../services/db';
import { getDocumentFormatLabel } from '../../services/utils';
import { authService } from '../../services/auth';
import { PRIMARY_ADMIN_EMAIL } from '../../services/firestoreSync';
import {
  ShieldCheck,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  History,
  UserPlus,
  Shield,
  X,
  Mail,
  Key,
  AlertCircle,
  Trash2,
  Eye,
  Ban,
  Layers,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  publications: Publication[];
  users: StoredUser[];
  onInspectPublication: (pub: Publication) => void;
  onViewAuditLogs: () => void;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  publications,
  users,
  onInspectPublication,
  onViewAuditLogs,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'papers' | 'admins' | 'audit'>('accounts');

  // Accounts filter & search
  const [accountStatusFilter, setAccountStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [accountSearch, setAccountSearch] = useState('');

  // Papers moderation filter & search
  const [paperSearch, setPaperSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [paperToDelete, setPaperToDelete] = useState<Publication | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Account action confirmation
  const [userToDelete, setUserToDelete] = useState<StoredUser | null>(null);

  // Add Admin Modal State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminInstitution, setAdminInstitution] = useState('');
  const [adminDepartment, setAdminDepartment] = useState('Administration');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  // Password Update State
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const researchers = useMemo(() => {
    return users
      .filter(u => u.role === 'RESEARCHER')
      .sort((a, b) => {
        if (a.accountStatus === 'PENDING' && b.accountStatus !== 'PENDING') return -1;
        if (a.accountStatus !== 'PENDING' && b.accountStatus === 'PENDING') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [users]);

  const admins = useMemo(() => {
    return users.filter(u => u.role === 'ADMIN');
  }, [users]);

  const auditLogs = useMemo(() => {
    return db.getAuditLogs();
  }, [publications, users]);

  const domainCategories = useMemo(() => {
    const counts = new Map<string, number>();
    publications.forEach(p => {
      const dom = p.researchArea?.trim() || 'General Research';
      counts.set(dom, (counts.get(dom) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [publications]);

  const stats = useMemo(() => {
    const pendingAccounts = researchers.filter(r => r.accountStatus === 'PENDING').length;
    const activeAccounts = researchers.filter(r => r.accountStatus === 'ACTIVE').length;
    const suspendedAccounts = researchers.filter(r => r.accountStatus === 'SUSPENDED').length;
    const publishedPapers = publications.filter(p => p.status === 'APPROVED').length;

    return {
      totalAccounts: researchers.length,
      pendingAccounts,
      activeAccounts,
      suspendedAccounts,
      publishedPapers,
      totalDomains: domainCategories.length,
    };
  }, [researchers, publications, domainCategories]);

  const filteredAccounts = useMemo(() => {
    return researchers.filter(r => {
      const matchStatus = accountStatusFilter === 'ALL' || r.accountStatus === accountStatusFilter;
      const q = accountSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.firstName.toLowerCase().includes(q) ||
        r.lastName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.institution.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [researchers, accountStatusFilter, accountSearch]);

  const filteredPapers = useMemo(() => {
    return publications
      .filter(p => {
        const dom = p.researchArea?.trim() || 'General Research';
        const matchDom = domainFilter === 'ALL' || dom.toLowerCase() === domainFilter.toLowerCase();
        const q = paperSearch.toLowerCase().trim();
        const matchQ =
          !q ||
          p.title.toLowerCase().includes(q) ||
          dom.toLowerCase().includes(q) ||
          p.submittedBy.firstName.toLowerCase().includes(q) ||
          p.submittedBy.lastName.toLowerCase().includes(q) ||
          p.submittedBy.email.toLowerCase().includes(q);
        return matchDom && matchQ;
      })
      .sort((a, b) => a.researchArea.localeCompare(b.researchArea));
  }, [publications, domainFilter, paperSearch]);

  const handleVerifyAccount = (userId: string) => {
    authService.verifyUserAccount(currentUser, userId);
    onRefresh();
  };

  const handleSuspendAccount = (userId: string) => {
    authService.suspendUserAccount(currentUser, userId);
    onRefresh();
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    authService.deleteUserAccount(currentUser, userToDelete.id);
    setUserToDelete(null);
    onRefresh();
  };

  const handleConfirmDeletePaper = () => {
    if (!paperToDelete) return;
    const pub = paperToDelete;
    db.deletePublication(pub.id);
    db.recordAudit(
      currentUser,
      'ADMIN_DELETE_PAPER',
      'PUBLICATION',
      pub.id,
      `Removed paper "${pub.title}" (${pub.researchArea}). Reason: ${deleteReason.trim() || 'Deemed not useful'}`
    );

    db.createNotification({
      recipientUserId: pub.submittedBy.id,
      type: 'PUBLICATION_REMOVED',
      title: 'Publication Removed by Administrator',
      message: `Your paper "${pub.title}" was removed from the repository.${
        deleteReason.trim() ? ` Note: ${deleteReason.trim()}` : ''
      }`,
      isRead: false,
    });

    setPaperToDelete(null);
    setDeleteReason('');
    onRefresh();
  };

  const handleCreateAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);
    setAdminLoading(true);

    const res = authService.createAdminByAdmin(currentUser, {
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      institution: adminInstitution,
      department: adminDepartment,
      password: adminPassword,
    });

    if (!res.success) {
      setAdminError(res.error || 'Failed to create administrator account.');
      setAdminLoading(false);
      return;
    }

    setAdminSuccess(`Administrator account created for ${adminEmail}.`);
    setAdminFirstName('');
    setAdminLastName('');
    setAdminEmail('');
    setAdminInstitution('');
    setAdminPassword('');
    setAdminLoading(false);
    onRefresh();
    setTimeout(() => {
      setShowAddAdminModal(false);
      setAdminSuccess(null);
    }, 1500);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPassInput !== confirmPassInput) {
      setPassMsg({ type: 'err', text: 'New password and confirmation do not match.' });
      return;
    }
    const res = authService.updateAdminPassword(currentUser, currentPassInput, newPassInput);
    if (!res.success) {
      setPassMsg({ type: 'err', text: res.error || 'Failed to update password.' });
      return;
    }
    setPassMsg({ type: 'ok', text: 'Administrator password updated and synced across devices.' });
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6D28D9] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#6D28D9]" />
            <span>External Administration Console</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-mono">Live Cloud Link Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">
            Account Verification & Repository Moderation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Verify newly created researcher accounts and remove unuseful or off-topic papers from domain categories.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onViewAuditLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-500" />
            Audit Trail
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Total Accounts</p>
          <p className="text-2xl font-bold text-[#1E1B4B] font-mono tabular-nums mt-1">
            {stats.totalAccounts}
          </p>
        </div>

        <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200">
          <p className="text-xs font-bold text-amber-800">Pending Verify</p>
          <p className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
            {stats.pendingAccounts}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Verified Active</p>
          <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
            {stats.activeAccounts}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Suspended</p>
          <p className="text-2xl font-bold text-[#F97316] font-mono tabular-nums mt-1">
            {stats.suspendedAccounts}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Published Papers</p>
          <p className="text-2xl font-bold text-[#6D28D9] font-mono tabular-nums mt-1">
            {stats.publishedPapers}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Domain Categories</p>
          <p className="text-2xl font-bold text-slate-800 font-mono tabular-nums mt-1">
            {stats.totalDomains}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'accounts'
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Accounts & Verification ({stats.pendingAccounts} pending)
        </button>

        <button
          onClick={() => setActiveTab('papers')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'papers'
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Papers Moderation ({publications.length})
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'admins'
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Administrators & Security ({admins.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: ACCOUNTS CREATED & VERIFICATION */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="Search by name, email, or institution..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-none">
              {(['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setAccountStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                    accountStatusFilter === status
                      ? 'bg-[#6D28D9] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  {status === 'ALL'
                    ? 'All Accounts'
                    : status === 'PENDING'
                    ? `Pending (${stats.pendingAccounts})`
                    : status === 'ACTIVE'
                    ? `Verified (${stats.activeAccounts})`
                    : `Suspended (${stats.suspendedAccounts})`}
                </button>
              ))}
            </div>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="p-12 text-center max-w-sm mx-auto">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700">No Matching Accounts Found</p>
              <p className="text-xs text-slate-400 mt-1">
                When users register in the BRAIN HUB Researcher App, their accounts appear here immediately for verification.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAccounts.map((r) => {
                const count = publications.filter(p => p.submittedBy.id === r.id).length;
                return (
                  <div
                    key={r.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">
                          {r.firstName} {r.lastName}
                        </h4>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            r.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.accountStatus === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {r.accountStatus === 'ACTIVE' ? 'VERIFIED ACTIVE' : r.accountStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-mono">{r.email}</p>
                      <p className="text-[11px] text-slate-500">
                        {r.institution} {r.department ? `· ${r.department}` : ''} · Registered{' '}
                        {new Date(r.createdAt).toLocaleDateString()} ·{' '}
                        <span className="font-semibold text-slate-700">
                          {count} {count === 1 ? 'Paper' : 'Papers'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {r.accountStatus !== 'ACTIVE' && (
                        <button
                          onClick={() => handleVerifyAccount(r.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verify Account
                        </button>
                      )}
                      {r.accountStatus === 'ACTIVE' && (
                        <button
                          onClick={() => handleSuspendAccount(r.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => setUserToDelete(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAPERS MODERATION (NO VERIFICATION — ADMIN CAN DELETE IF NOT USEFUL) */}
      {activeTab === 'papers' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={paperSearch}
                onChange={(e) => setPaperSearch(e.target.value)}
                placeholder="Search title, domain, or researcher..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Layers className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="ALL">All Domain Categories ({publications.length})</option>
                {domainCategories.map((dom) => (
                  <option key={dom.name} value={dom.name}>
                    {dom.name} ({dom.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredPapers.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700">No Papers Found</p>
              <p className="text-xs text-slate-400 mt-1">
                Published papers from verified researchers will appear here, sorted by their domain category.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPapers.map((pub) => (
                <div
                  key={pub.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-bold text-[#6D28D9] bg-purple-50 px-2 py-0.5 rounded">
                        {pub.researchArea}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        By {pub.submittedBy.firstName} {pub.submittedBy.lastName} ({pub.submittedBy.email})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(pub.updatedAt).toLocaleDateString()}
                      </span>
                      {pub.documentOriginalName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {getDocumentFormatLabel(pub.documentOriginalName, pub.documentMimeType)}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-[#1E1B4B] leading-snug">
                      {pub.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {pub.abstractText}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${
                        pub.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {pub.status === 'APPROVED' ? 'PUBLISHED' : 'DRAFT'}
                    </span>

                    <button
                      onClick={() => onInspectPublication(pub)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect
                    </button>

                    <button
                      onClick={() => {
                        setPaperToDelete(pub);
                        setDeleteReason('');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Paper
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMINISTRATORS & SECURITY */}
      {activeTab === 'admins' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#6D28D9]" />
                  <h3 className="text-sm font-bold text-[#1E1B4B]">
                    System Administrators
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Authorized accounts with access to this Separate Admin Dashboard.
                </p>
              </div>

              <button
                onClick={() => {
                  setAdminError(null);
                  setAdminSuccess(null);
                  setShowAddAdminModal(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                Add Administrator
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {admins.map((admin) => {
                const isMainAdmin = admin.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                return (
                  <div key={admin.id} className="p-4 sm:p-5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 text-[#6D28D9] flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200">
                        {admin.firstName[0]}{admin.lastName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900">
                            {admin.firstName} {admin.lastName}
                          </h4>
                          {isMainAdmin && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#6D28D9] border border-purple-200">
                              Primary Administrator
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{admin.email}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{admin.institution}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change Admin Password Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#6D28D9]" />
              <h3 className="text-sm font-bold text-[#1E1B4B]">Update My Password</h3>
            </div>
            <p className="text-xs text-slate-500">
              Change the administrator sign-in password for <strong>{currentUser.email}</strong>.
            </p>

            {passMsg && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  passMsg.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {passMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-colors cursor-pointer"
              >
                Save New Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT HISTORY */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-[#1E1B4B]">System Audit Log</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-slate-50 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#6D28D9]">{log.action}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{log.entityType}</span>
                  </div>
                  <p className="text-slate-700 font-sans text-xs">{log.metadata || 'Event recorded'}</p>
                  <p className="text-[11px] text-slate-400">Actor: {log.actorEmail}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400 shrink-0 tabular-nums">
                  {new Date(log.createdAt).toLocaleTimeString()} · {new Date(log.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PAPER MODAL */}
      {paperToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Unuseful Paper?</h3>
                <p className="text-xs text-slate-500">This removes the paper from the public repository everywhere.</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <p className="font-bold text-slate-900 line-clamp-2">{paperToDelete.title}</p>
              <p className="text-slate-500 mt-1">Domain: {paperToDelete.researchArea}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Removal Note for Author (Optional)
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate submission or insufficient research relevance"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPaperToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeletePaper}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer"
              >
                Confirm Delete Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE USER MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete User Account?</h3>
            <p className="text-xs text-slate-600">
              Permanently remove <strong>{userToDelete.firstName} {userToDelete.lastName}</strong> ({userToDelete.email})?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ADMINISTRATOR MODAL */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#6D28D9]" />
                <div>
                  <h3 className="text-sm font-bold text-[#1E1B4B]">Provision New Administrator</h3>
                  <p className="text-[11px] text-slate-500">Creates a verified administrator account</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminSubmit} className="p-6 space-y-4">
              {adminError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{adminError}</span>
                </div>
              )}

              {adminSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{adminSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Institution *</label>
                  <input
                    type="text"
                    required
                    value={adminInstitution}
                    onChange={(e) => setAdminInstitution(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={adminDepartment}
                    onChange={(e) => setAdminDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 8 chars) *</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md cursor-pointer disabled:opacity-50"
                >
                  {adminLoading ? 'Creating...' : 'Create Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
