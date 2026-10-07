import React, { useState, useMemo } from 'react';
import { Publication, User, AuditLog } from '../../types';
import { db } from '../../services/db';
import { ShieldCheck, Users, FileText, CheckCircle2, Clock, XCircle, Search, Filter, Eye, History, RotateCcw } from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  publications: Publication[];
  onReviewPublication: (pub: Publication) => void;
  onViewAuditLogs: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  publications,
  onReviewPublication,
  onViewAuditLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'users' | 'audit'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('SUBMITTED');
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');

  // Load real registered researchers from DB
  const researchers = useMemo(() => {
    return db.getUsers().filter(u => u.role === 'RESEARCHER');
  }, [publications]);

  const auditLogs = useMemo(() => {
    return db.getAuditLogs();
  }, [publications]);

  // Aggregate Admin Stats
  const stats = useMemo(() => {
    const pending = publications.filter(p => p.status === 'SUBMITTED' || p.status === 'UNDER_REVIEW').length;
    const approved = publications.filter(p => p.status === 'APPROVED').length;
    const rejected = publications.filter(p => p.status === 'REJECTED').length;
    const unread = db.getNotifications(currentUser.id).filter(n => !n.isRead).length;

    return {
      totalResearchers: researchers.length,
      totalPublications: publications.length,
      pendingReviews: pending,
      approvedPublications: approved,
      rejectedPublications: rejected,
      unreadNotifications: unread,
    };
  }, [publications, researchers, currentUser.id]);

  // Review Queue Filtered
  const filteredQueue = useMemo(() => {
    return publications.filter(p => {
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchArea = areaFilter === 'ALL' || p.researchArea === areaFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.submittedBy.firstName.toLowerCase().includes(q) ||
        p.submittedBy.lastName.toLowerCase().includes(q) ||
        p.submittedBy.institution.toLowerCase().includes(q);

      return matchStatus && matchArea && matchQuery;
    });
  }, [publications, statusFilter, areaFilter, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6D28D9] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#6D28D9]" />
            <span>Editorial Board Administration Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">
            Editorial Review & Verification Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Inspect peer submissions, verify research manuscripts, record formal approval decisions, and audit system events.
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

      {/* Admin Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Registered Authors</p>
          <p className="text-2xl font-bold text-[#1E1B4B] font-mono tabular-nums mt-1">
            {stats.totalResearchers}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Total Publications</p>
          <p className="text-2xl font-bold text-slate-800 font-mono tabular-nums mt-1">
            {stats.totalPublications}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20">
          <p className="text-xs font-bold text-blue-700">Pending Reviews</p>
          <p className="text-2xl font-bold text-blue-700 font-mono tabular-nums mt-1">
            {stats.pendingReviews}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Approved Papers</p>
          <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
            {stats.approvedPublications}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Rejected Papers</p>
          <p className="text-2xl font-bold text-[#F97316] font-mono tabular-nums mt-1">
            {stats.rejectedPublications}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Unread Alerts</p>
          <p className="text-2xl font-bold text-[#6D28D9] font-mono tabular-nums mt-1">
            {stats.unreadNotifications}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          Review Queue ({stats.pendingReviews} pending)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          Researcher Accounts ({researchers.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          Audit History ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: REVIEW QUEUE */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search submission or author..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-none">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="SUBMITTED">Pending Submissions</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved Papers</option>
                <option value="REJECTED">Rejected Papers</option>
                <option value="ALL">All Statuses</option>
              </select>
            </div>
          </div>

          {/* Queue List */}
          {filteredQueue.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700">No Submissions Found in Queue</p>
              <p className="text-xs text-slate-400 mt-1">
                When researchers submit publication drafts for review, they will appear here for verification.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredQueue.map((pub) => (
                <div
                  key={pub.id}
                  className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#6D28D9]">{pub.researchArea}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Submitted by {pub.submittedBy.firstName} {pub.submittedBy.lastName} ({pub.submittedBy.institution})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(pub.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#1E1B4B] leading-snug">
                      {pub.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {pub.abstractText}
                    </p>

                    {pub.documentOriginalName && (
                      <p className="text-[11px] font-mono text-slate-500">
                        Manuscript: <span className="font-semibold text-slate-700">{pub.documentOriginalName}</span> (
                        {pub.documentSize ? `${(pub.documentSize / 1024 / 1024).toFixed(2)} MB` : 'PDF'})
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                        pub.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : pub.status === 'SUBMITTED'
                          ? 'bg-blue-50 text-blue-700'
                          : pub.status === 'UNDER_REVIEW'
                          ? 'bg-purple-50 text-purple-700'
                          : pub.status === 'REJECTED'
                          ? 'bg-orange-50 text-[#F97316]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {pub.status}
                    </span>

                    <button
                      onClick={() => onReviewPublication(pub)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Review & Decide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-[#1E1B4B]">
              Registered Researcher Accounts
            </h3>
            <p className="text-xs text-slate-500">
              Verified academic users eligible to author and submit publications.
            </p>
          </div>

          {researchers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No researchers registered yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {researchers.map((r) => {
                const count = publications.filter(p => p.submittedBy.id === r.id).length;
                return (
                  <div key={r.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {r.firstName} {r.lastName}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">{r.email}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {r.institution} {r.department ? `· ${r.department}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {count} {count === 1 ? 'Publication' : 'Publications'}
                      </span>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase mt-0.5">
                        {r.accountStatus}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-[#1E1B4B]">
              Immutable System Audit Log
            </h3>
            <p className="text-xs text-slate-500">
              Compliance history recording authentication, publication changes, and review decisions.
            </p>
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
    </div>
  );
};
