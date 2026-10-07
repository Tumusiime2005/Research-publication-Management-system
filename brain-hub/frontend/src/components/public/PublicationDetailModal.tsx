import React, { useState } from 'react';
import { Publication } from '../../types';
import { X, Download, Copy, Check, Users, ShieldCheck, FileText, Calendar, Building } from 'lucide-react';

interface PublicationDetailModalProps {
  publication: Publication | null;
  onClose: () => void;
}

export const PublicationDetailModal: React.FC<PublicationDetailModalProps> = ({
  publication,
  onClose,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!publication) return null;

  const primaryReview = publication.reviews && publication.reviews.length > 0 ? publication.reviews[0] : null;

  const copyCitation = (type: 'APA' | 'BibTeX') => {
    let citation = '';
    const authorNames = publication.authors.map(a => a.authorName).join(', ');
    const year = publication.publishedAt ? new Date(publication.publishedAt).getFullYear() : 2026;

    if (type === 'APA') {
      citation = `${authorNames} (${year}). ${publication.title}. BRAIN HUB Academic Repository, ${publication.researchArea}.`;
    } else {
      const citeKey = publication.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) + year;
      citation = `@article{${citeKey},\n  title={${publication.title}},\n  author={${authorNames}},\n  journal={BRAIN HUB},\n  year={${year}},\n  note={${publication.researchArea}}\n}`;
    }

    navigator.clipboard.writeText(citation);
    setCopiedFormat(type);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownloadDocument = () => {
    if (publication.documentData) {
      const link = document.createElement('a');
      link.href = publication.documentData;
      link.download = publication.documentOriginalName || 'research-paper.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Simulate download for seeded documents
      const blob = new Blob([`BRAIN HUB Research Paper: ${publication.title}\nAuthors: ${publication.authors.map(a => a.authorName).join(', ')}\nAbstract:\n${publication.abstractText}`], { type: 'application/pdf' });
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
        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-semibold text-[#6D28D9]">{publication.researchArea}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {publication.publishedAt
                  ? new Date(publication.publishedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Published'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold">
                PEER-REVIEWED & APPROVED
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1E1B4B] leading-tight">
              {publication.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Authors section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Contributing Authors & Affiliations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {publication.authors.map((author) => (
                <div
                  key={author.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-[#B0D9F2]/50 text-[#1E1B4B] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {author.authorOrder}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {author.authorName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {author.authorEmail}
                    </p>
                    {author.isRegisteredUser && (
                      <span className="text-[10px] text-[#6D28D9] font-medium inline-block mt-0.5">
                        Verified Member ({publication.submittedBy.institution})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Abstract */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Abstract
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-white border border-slate-100 p-4 rounded-lg font-serif">
              {publication.abstractText}
            </p>
          </div>

          {/* Keywords */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {publication.keywords.split(',').map((kw, i) => (
                <span
                  key={i}
                  className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium"
                >
                  {kw.trim()}
                </span>
              ))}
            </div>
          </div>

          {/* Editorial Verification Note */}
          {primaryReview && (
            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-[#6D28D9] mb-1.5">
                <ShieldCheck className="w-4 h-4 text-[#6D28D9]" />
                Editorial Verification Statement
              </div>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                "{primaryReview.verificationNotes}"
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                <span>Verified by: {primaryReview.reviewerName}</span>
                <span>
                  {new Date(primaryReview.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Actions: Download PDF & Copy Citation */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {publication.documentOriginalName || 'Research Document (PDF)'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {publication.documentSize
                    ? `${(publication.documentSize / 1024 / 1024).toFixed(2)} MB · Application/PDF`
                    : 'Verified PDF Document'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => copyCitation('APA')}
                className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedFormat === 'APA' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                Copy APA
              </button>
              <button
                onClick={() => copyCitation('BibTeX')}
                className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedFormat === 'BibTeX' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                Copy BibTeX
              </button>
              <button
                onClick={handleDownloadDocument}
                className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
