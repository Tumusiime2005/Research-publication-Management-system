import React, { useState, useMemo } from 'react';
import { Publication, User } from '../../types';
import { db } from '../../services/db';
import { Plus, FileText, Send, CheckCircle2, Clock, XCircle, AlertCircle, Edit3, Trash2, Eye, Filter } from 'lucide-react';

interface ResearcherDashboardProps {
  currentUser: User;
  publications: Publication[];
  onOpenCreate: () => void;
  onEditPublication: (pub: Publication) => void;
  onViewPublication: (pub: Publication) => void;
  onSubmitPublication: (pub: Publication) => void;
}

export const ResearcherDashboard: React.FC<ResearcherDashboardProps> = ({
  currentUser,
  publications,
  onOpenCreate,
  onEditPublication,
  onViewPublication,
  onSubmitPublication,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter papers authored by this researcher
  const myPublications = useMemo(() => {
    return publications.filter(p => p.submittedBy.id === currentUser.id);
  }, [publications, currentUser.id]);

  // Real database stats
  const stats = useMemo(() => {
    return {
      total: myPublications.length,
      drafts: myPublications.filter(p => p.status === 'DRAFT').length,
      submitted: myPublications.filter(p => p.status === 'SUBMITTED').length,
      underReview: myPublications.filter(p => p.status === 'UNDER_REVIEW').length,
      approved: myPublications.filter(p => p.status === 'APPROVED').length,
      rejected: myPublications.filter(p => p.status === 'REJECTED').length,
    };
  }, [myPublications]);

  const filteredList = useMemo(() => {
    if (statusFilter === 'ALL') return myPublications;
    return myPublications.filter(p => p.status === statusFilter);
  }, [myPublications, statusFilter]);

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this unpublished draft?')) {
      db.deletePublication(id);
      db.recordAudit(currentUser, 'DELETE_DRAFT', 'PUBLICATION', id, 'Researcher deleted draft');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6D28D9] mb-1">
            <span>Researcher Workspace</span>
            <span aria-hidden="true">·</span>
            <span>{currentUser.institution}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">
            Welcome, {currentUser.firstName} {currentUser.lastName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your academic publications, submit papers for peer review, and monitor editorial status.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-lg transition-all shadow-xs cursor-pointer active:scale-[0.99] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Publication Draft
        </button>
      </div>

      {/* Real Statistics Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Total Papers</p>
          <p className="text-2xl font-bold text-[#1E1B4B] font-mono tabular-nums mt-1">
            {stats.total}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Drafts</p>
          <p className="text-2xl font-bold text-slate-700 font-mono tabular-nums mt-1">
            {stats.drafts}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Submitted</p>
          <p className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-1">
            {stats.submitted}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Under Review</p>
          <p className="text-2xl font-bold text-purple-600 font-mono tabular-nums mt-1">
            {stats.underReview}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Approved</p>
          <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
            {stats.approved}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Rejected</p>
          <p className="text-2xl font-bold text-[#F97316] font-mono tabular-nums mt-1">
            {stats.rejected}
          </p>
        </div>
      </div>

      {/* Publications Table Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#6D28D9]" />
            <h2 className="text-sm font-bold text-[#1E1B4B]">
              My Research Submissions
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              ({filteredList.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {['ALL', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#6D28D9] text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {filteredList.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              {myPublications.length === 0
                ? 'No Publications Recorded'
                : 'No Publications in this Status'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {myPublications.length === 0
                ? 'You have not drafted or submitted any research papers yet. Create your first draft to initiate the peer-review cycle.'
                : 'Try selecting "All Statuses" to view your other drafts and submissions.'}
            </p>
            {myPublications.length === 0 && (
              <div className="mt-4">
                <button
                  onClick={onOpenCreate}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-all shadow-xs cursor-pointer"
                >
                  Create Initial Draft
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredList.map((pub) => {
              const latestReview = pub.reviews && pub.reviews.length > 0 ? pub.reviews[0] : null;
              return (
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

                    {/* Review Notes Callout if present */}
                    {latestReview && pub.status !== 'APPROVED' && (
                      <div className="mt-2 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-md text-xs text-amber-900">
                        <span className="font-bold">Editorial Notes ({latestReview.decision}):</span>{' '}
                        {latestReview.verificationNotes}
                      </div>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
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
                          <button
                            onClick={() => onSubmitPublication(pub)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                            title="Submit for Review"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Submit
                          </button>
                          <button
                            onClick={(e) => handleDeleteDraft(pub.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
