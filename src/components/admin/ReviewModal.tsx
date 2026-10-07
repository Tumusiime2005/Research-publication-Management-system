import React, { useState } from 'react';
import { Publication, User, ReviewDecision } from '../../types';
import { db, generateUUID } from '../../services/db';
import { X, ShieldCheck, Download, AlertCircle, CheckCircle2, RotateCcw, XCircle, FileText } from 'lucide-react';

interface ReviewModalProps {
  publication: Publication | null;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  publication,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [decision, setDecision] = useState<ReviewDecision>('APPROVED');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!publication) return null;

  const handleSubmitDecision = () => {
    setError(null);

    if (decision === 'REJECTED' && verificationNotes.trim().length < 10) {
      setError('A formal rejection requires comprehensive reviewer notes explaining deficiencies (minimum 10 characters).');
      return;
    }

    if (decision === 'REVISION_REQUESTED' && verificationNotes.trim().length < 10) {
      setError('Please specify the exact revisions and editorial corrections requested for the author.');
      return;
    }

    if (!verificationNotes.trim()) {
      setError('Verification notes are required for institutional record.');
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const reviewItem = {
        id: generateUUID(),
        publicationId: publication.id,
        reviewerId: currentUser.id,
        reviewerName: `${currentUser.firstName} ${currentUser.lastName}`,
        decision,
        verificationNotes: verificationNotes.trim(),
        createdAt: now,
      };

      const updatedPub: Publication = {
        ...publication,
        reviews: [reviewItem, ...(publication.reviews || [])],
        updatedAt: now,
      };

      let notifTitle = '';
      let notifMessage = '';

      if (decision === 'APPROVED') {
        updatedPub.status = 'APPROVED';
        updatedPub.publishedAt = now;
        notifTitle = 'Publication Approved & Published!';
        notifMessage = `Your paper "${publication.title}" has been approved by the editorial committee and published in the repository.`;
      } else if (decision === 'REJECTED') {
        updatedPub.status = 'REJECTED';
        notifTitle = 'Publication Submission Rejected';
        notifMessage = `Your submission "${publication.title}" was rejected. Reviewer notes: ${verificationNotes.trim()}`;
      } else if (decision === 'REVISION_REQUESTED') {
        updatedPub.status = 'DRAFT'; // Returns to draft so researcher can edit
        notifTitle = 'Editorial Revision Requested';
        notifMessage = `Revisions were requested for "${publication.title}". Reviewer notes: ${verificationNotes.trim()}`;
      }

      db.savePublication(updatedPub);

      // Record in immutable audit log
      db.recordAudit(
        currentUser,
        `REVIEW_DECISION_${decision}`,
        'PUBLICATION',
        publication.id,
        `Admin ${currentUser.email} decided ${decision} for paper ${publication.title}`
      );

      // Send in-app notification to the researcher
      db.createNotification({
        recipientUserId: publication.submittedBy.id,
        type: `REVIEW_${decision}`,
        title: notifTitle,
        message: notifMessage,
        relatedPublicationId: publication.id,
        isRead: false,
      });

      setSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review');
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (publication.documentData) {
      const link = document.createElement('a');
      link.href = publication.documentData;
      link.download = publication.documentOriginalName || 'paper.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([publication.abstractText], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = publication.documentOriginalName || 'paper.pdf';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#6D28D9]" />
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">
                Publication Review & Verification Decision
              </h2>
              <p className="text-xs text-slate-500">
                Review submitted manuscript and record formal editorial board determination.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submission Overview */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#6D28D9]">{publication.researchArea}</span>
              <span aria-hidden="true">·</span>
              <span>Author: {publication.submittedBy.firstName} {publication.submittedBy.lastName}</span>
              <span aria-hidden="true">·</span>
              <span>{publication.submittedBy.institution}</span>
            </div>
            <h3 className="text-base font-bold text-[#1E1B4B]">
              {publication.title}
            </h3>
            <p className="text-xs text-slate-600 font-serif leading-relaxed line-clamp-4">
              {publication.abstractText}
            </p>

            {publication.documentOriginalName && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-600">
                  Manuscript File: {publication.documentOriginalName}
                </span>
                <button
                  onClick={handleDownloadPDF}
                  className="px-2.5 py-1 text-xs font-semibold text-[#6D28D9] hover:bg-purple-50 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Inspect Document
                </button>
              </div>
            )}
          </div>

          {/* Decision Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Editorial Determination *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  decision === 'APPROVED'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Publication
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Verified for public indexing in open repository.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REVISION_REQUESTED')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  decision === 'REVISION_REQUESTED'
                    ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-[#6D28D9]">
                  <RotateCcw className="w-4 h-4" />
                  Request Revisions
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Re-opens draft to researcher with editorial instructions.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  decision === 'REJECTED'
                    ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-[#F97316]">
                  <XCircle className="w-4 h-4" />
                  Reject Submission
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Declined with mandatory written rationale.
                </p>
              </button>
            </div>
          </div>

          {/* Verification Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Editorial Verification Notes & Critique *
            </label>
            <textarea
              required
              rows={4}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder={
                decision === 'APPROVED'
                  ? 'State validation criteria met (e.g. Theoretical proofs and reproducibility confirmed)...'
                  : decision === 'REVISION_REQUESTED'
                  ? 'Detail required corrections, missing citations, or methodological clarifications...'
                  : 'Specify comprehensive rejection justification (minimum 10 characters)...'
              }
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
            />
            <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
              {verificationNotes.length} characters entered.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-md cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmitDecision}
            className={`px-4 py-2 text-xs font-bold text-white rounded-md transition-all shadow-xs cursor-pointer ${
              decision === 'APPROVED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : decision === 'REVISION_REQUESTED'
                ? 'bg-[#6D28D9] hover:bg-[#5B21B6]'
                : 'bg-[#F97316] hover:bg-orange-600'
            }`}
          >
            {submitting ? 'Recording...' : `Confirm Decision: ${decision}`}
          </button>
        </div>
      </div>
    </div>
  );
};
