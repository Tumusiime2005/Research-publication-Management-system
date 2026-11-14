import React, { useState, useMemo } from 'react';
import { Publication, User } from '../../types';
import { db } from '../../services/db';
import { Plus, FileText, Send, CheckCircle2, Clock, Edit3, Trash2, Eye, ShieldAlert } from 'lucide-react';

interface ResearcherDashboardProps {
  currentUser: User;
  publications: Publication[];
  onOpenCreate: () => void;
  onEditPublication: (pub: Publication) => void;
  onViewPublication: (pub: Publication) => void;
  onPublishDraft: (pub: Publication) => void;
}

export const ResearcherDashboard: React.FC<ResearcherDashboardProps> = ({
  currentUser,
  publications,
  onOpenCreate,
  onEditPublication,
  onViewPublication,
  onPublishDraft,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const isVerified = currentUser.accountStatus === 'ACTIVE';

  // Filter papers authored by this researcher
  const myPublications = useMemo(() => {
    return publications.filter(p => p.submittedBy.id === currentUser.id);
  }, [publications, currentUser.id]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: myPublications.length,
      drafts: myPublications.filter(p => p.status === 'DRAFT').length,
      published: myPublications.filter(p => p.status === 'APPROVED').length,
    };
  }, [myPublications]);

  const filteredList = useMemo(() => {
    if (statusFilter === 'ALL') return myPublications;
    return myPublications.filter(p => p.status === statusFilter);
  }, [myPublications, statusFilter]);

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this paper?')) {
      db.deletePublication(id);
      db.recordAudit(currentUser, 'DELETE_PAPER', 'PUBLICATION', id, 'Researcher deleted paper');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Pending Verification Alert Banner */}
      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-amber-950">
                Account Verification Pending
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200/70 text-amber-900">
                {currentUser.accountStatus}
              </span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Your account (<strong>{currentUser.email}</strong>) has been registered and synced with the BRAIN HUB Administrator Dashboard. While verification is pending, you can compose and save paper drafts. Once an administrator verifies your account, you will be notified immediately and can publish papers directly into the public domain categories.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6D28D9] mb-1">
            <span>Researcher Workspace</span>
            <span aria-hidden="true">·</span>
            <span>{currentUser.institution}</span>
            <span aria-hidden="true">·</span>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Researcher
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <Clock className="w-3.5 h-3.5" /> Pending Verification
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">
            Welcome, {currentUser.firstName} {currentUser.lastName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Draft, organize by research domain, and publish your academic manuscripts to the public repository.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-lg transition-all shadow-xs cursor-pointer active:scale-[0.99] shrink-0"
        >
          <Plus className="w-4 h-4" />
          {isVerified ? 'Publish / Draft Paper' : 'Create Draft'}
        </button>
      </div>

      {/* Real Statistics Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Total Papers</p>
          <p className="text-2xl font-bold text-[#1E1B4B] font-mono tabular-nums mt-1">
            {stats.total}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Saved Drafts</p>
          <p className="text-2xl font-bold text-slate-700 font-mono tabular-nums mt-1">
            {stats.drafts}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Published Live</p>
          <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
            {stats.published}
          </p>
        </div>
      </div>

      {/* Publications Table Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#6D28D9]" />
            <h2 className="text-sm font-bold text-[#1E1B4B]">
              My Research Papers
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              ({filteredList.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Papers' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'APPROVED', label: 'Published' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors shrink-0 cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-[#6D28D9] text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              {myPublications.length === 0
                ? 'No Publications Yet'
                : 'No Papers Match Filter'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {myPublications.length === 0
                ? 'Create a research paper and specify your research domain (e.g., Distributional Systems or Computational Neuroscience).'
                : 'Try selecting "All Papers" to view your other drafts and published work.'}
            </p>
            {myPublications.length === 0 && (
              <div className="mt-4">
                <button
                  onClick={onOpenCreate}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-all shadow-xs cursor-pointer"
                >
                  Create First Paper
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredList.map((pub) => (
              <div
                key={pub.id}
                onClick={() => onViewPublication(pub)}
                className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#6D28D9]">{pub.researchArea}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Created {new Date(pub.createdAt).toLocaleDateString()}
                    </span>
                    {pub.documentOriginalName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-400 truncate max-w-[200px]">
                          {pub.documentOriginalName}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#1E1B4B] hover:text-[#6D28D9] transition-colors leading-snug">
                    {pub.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {pub.abstractText}
                  </p>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                      pub.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pub.status === 'APPROVED' ? 'PUBLISHED' : 'DRAFT'}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {pub.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => onEditPublication(pub)}
                          className="p-1.5 text-slate-500 hover:text-[#6D28D9] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Edit Draft"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {isVerified && (
                          <button
                            onClick={() => onPublishDraft(pub)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                            title="Publish Paper Live"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Publish
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={(e) => handleDeleteDraft(pub.id, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Delete Paper"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onViewPublication(pub)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
