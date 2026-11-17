import React, { useState, useEffect, useMemo } from 'react';
import { Publication, User, PublicationAuthor } from '../../types';
import { db, generateUUID, normalizeDomainName } from '../../services/db';
import { getDocumentFormatLabel, inferDocumentMimeType, isDangerousExecutable } from '../../services/utils';
import { triggerDeviceNotification } from '../../services/deviceNotifications';
import { X, Plus, Trash2, Upload, AlertCircle, Tag } from 'lucide-react';

interface PublicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  editPublication?: Publication | null;
  onSuccess: () => void;
}

const DEFAULT_SUGGESTED_DOMAINS = [
  'Distributional Systems',
  'Computational Neuroscience',
  'Computer Science & AI',
  'Biomedical Informatics',
  'Quantum Information Science',
  'Applied Mathematics',
  'Environmental Engineering',
];

export const PublicationFormModal: React.FC<PublicationFormModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  editPublication,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [keywords, setKeywords] = useState('');

  // Authors
  const [authors, setAuthors] = useState<Array<{ name: string; email: string; order: number; isUser: boolean }>>([]);

  // File upload state
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [fileMimeType, setFileMimeType] = useState<string | undefined>(undefined);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Collect all active domains from existing publications + defaults for instant suggestions
  const suggestedDomains = useMemo(() => {
    const existing = db
      .getPublications()
      .map((p) => p.researchArea?.trim())
      .filter(Boolean);
    return Array.from(new Set([...existing, ...DEFAULT_SUGGESTED_DOMAINS]));
  }, [isOpen]);

  useEffect(() => {
    if (editPublication) {
      setTitle(editPublication.title);
      setAbstractText(editPublication.abstractText);
      setResearchArea(editPublication.researchArea);
      setKeywords(editPublication.keywords);
      setExistingFileName(editPublication.documentOriginalName || null);
      setFileSize(editPublication.documentSize);
      setFileMimeType(editPublication.documentMimeType);
      setFileBase64(editPublication.documentData || null);
      setAuthors(
        editPublication.authors.map(a => ({
          name: a.authorName,
          email: a.authorEmail,
          order: a.authorOrder,
          isUser: a.isRegisteredUser,
        }))
      );
    } else {
      setTitle('');
      setAbstractText('');
      setResearchArea('');
      setKeywords('');
      setFileBase64(null);
      setExistingFileName(null);
      setFileSize(undefined);
      setFileMimeType(undefined);
      setAuthors([
        {
          name: `${currentUser.firstName} ${currentUser.lastName}`,
          email: currentUser.email,
          order: 1,
          isUser: true,
        },
      ]);
    }
    setError(null);
  }, [editPublication, currentUser, isOpen]);

  if (!isOpen) return null;

  const handleAddAuthor = () => {
    setAuthors([
      ...authors,
      {
        name: '',
        email: '',
        order: authors.length + 1,
        isUser: false,
      },
    ]);
  };

  const handleRemoveAuthor = (index: number) => {
    if (authors.length <= 1) return;
    const updated = authors.filter((_, i) => i !== index).map((a, i) => ({ ...a, order: i + 1 }));
    setAuthors(updated);
  };

  const handleAuthorChange = (index: number, field: 'name' | 'email', val: string) => {
    const updated = [...authors];
    updated[index][field] = val;
    setAuthors(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isDangerousExecutable(file.name)) {
      setError('Executable or system script files are not allowed. Please upload a document file (e.g. PDF, DOCX, PPTX, TXT, ODT).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds maximum allowable size limit of 25MB.');
      return;
    }

    setExistingFileName(file.name);
    setFileSize(file.size);
    setFileMimeType(inferDocumentMimeType(file.name, file.type));
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (actionType: 'DRAFT' | 'PUBLISH') => {
    setError(null);

    if (title.trim().length < 5) {
      setError('Publication title must be at least 5 characters in length.');
      return;
    }

    if (researchArea.trim().length < 2) {
      setError('Please enter a research domain (e.g., Distributional Systems or Computational Neuroscience).');
      return;
    }

    if (abstractText.trim().length < 20) {
      setError('Abstract must be at least 20 characters in length.');
      return;
    }

    if (!keywords.trim()) {
      setError('Please provide at least one keyword for indexing.');
      return;
    }

    for (const a of authors) {
      if (!a.name.trim() || !a.email.trim()) {
        setError('All authors must have a valid full name and email address.');
        return;
      }
    }

    setSaving(true);

    try {
      const pubId = editPublication ? editPublication.id : generateUUID();
      const now = new Date().toISOString();
      const normalizedDomain = normalizeDomainName(researchArea);

      const publicationAuthors: PublicationAuthor[] = authors.map((a) => ({
        id: generateUUID(),
        publicationId: pubId,
        authorName: a.name.trim(),
        authorEmail: a.email.trim(),
        authorOrder: a.order,
        isRegisteredUser: a.isUser,
      }));

      const newStatus = actionType === 'PUBLISH' ? 'APPROVED' : 'DRAFT';

      const publicationData: Publication = {
        id: pubId,
        title: title.trim(),
        abstractText: abstractText.trim(),
        researchArea: normalizedDomain,
        keywords: keywords.trim(),
        documentOriginalName: existingFileName || undefined,
        documentSize: fileSize,
        documentMimeType: existingFileName
          ? fileMimeType || inferDocumentMimeType(existingFileName)
          : undefined,
        documentData: fileBase64 || undefined,
        status: newStatus,
        submittedBy: currentUser,
        publishedAt: actionType === 'PUBLISH' ? (editPublication?.publishedAt || now) : undefined,
        createdAt: editPublication ? editPublication.createdAt : now,
        updatedAt: now,
        authors: publicationAuthors,
        reviews: editPublication ? editPublication.reviews : [],
      };

      db.savePublication(publicationData);

      if (actionType === 'PUBLISH') {
        db.recordAudit(
          currentUser,
          'PUBLISH_PUBLICATION',
          'PUBLICATION',
          pubId,
          `Published under domain "${normalizedDomain}": ${publicationData.title}`
        );

        // Notify admins for awareness/moderation
        const admins = db.getUsers().filter(u => u.role === 'ADMIN');
        admins.forEach(admin => {
          db.createNotification({
            recipientUserId: admin.id,
            type: 'NEW_PUBLICATION',
            title: 'New Research Paper Published',
            message: `${currentUser.firstName} ${currentUser.lastName} published "${publicationData.title}" under category "${normalizedDomain}".`,
            relatedPublicationId: pubId,
            isRead: false,
          });
        });

        // Notify submitting author
        db.createNotification({
          recipientUserId: currentUser.id,
          type: 'PUBLICATION_LIVE',
          title: 'Paper Published to Repository',
          message: `Your paper "${publicationData.title}" is now live in the "${normalizedDomain}" category.`,
          relatedPublicationId: pubId,
          isRead: false,
        });

        triggerDeviceNotification(
          'Paper Published on BRAIN HUB',
          `"${publicationData.title}" is now live under ${normalizedDomain}.`
        );
      } else {
        db.recordAudit(
          currentUser,
          editPublication ? 'UPDATE_DRAFT' : 'CREATE_DRAFT',
          'PUBLICATION',
          pubId,
          `Draft saved: ${publicationData.title}`
        );
      }

      setSaving(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save publication');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-xl shadow-2xl border border-slate-200 overflow-hidden sm:my-8 max-h-[94vh] flex flex-col">
        {/* Mobile grab handle */}
        <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#1E1B4B]">
              {editPublication ? 'Edit Research Paper' : 'Submit & Publish Research Paper'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your research domain, metadata, contributing authors, and manuscript (PDF, DOCX, PPTX, etc.).
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Publication Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Asymptotic Error Bounds in High-Dimensional Tensor Decomposition"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Research Domain / Category *
              </label>
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  list="domain-suggestions"
                  value={researchArea}
                  onChange={(e) => setResearchArea(e.target.value)}
                  placeholder="e.g. Distributional Systems, Computational Neuroscience"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                />
                <datalist id="domain-suggestions">
                  {suggestedDomains.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Papers sharing the same domain are automatically grouped into one category.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suggestedDomains.slice(0, 4).map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setResearchArea(domain)}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                      researchArea.toLowerCase() === domain.toLowerCase()
                        ? 'bg-[#6D28D9] text-white border-[#6D28D9]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keywords (comma separated) *
              </label>
              <input
                type="text"
                required
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="consensus, fault tolerance, neural models"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Abstract (Executive Summary & Methodology) *
            </label>
            <textarea
              required
              rows={5}
              value={abstractText}
              onChange={(e) => setAbstractText(e.target.value)}
              placeholder="Detail the research hypothesis, methodology, primary findings, and theoretical contribution..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] font-serif"
            />
            <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
              {abstractText.length} characters (minimum 20 characters required)
            </p>
          </div>

          {/* Authors List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contributing Authors ({authors.length})
              </label>
              <button
                type="button"
                onClick={handleAddAuthor}
                className="text-xs font-semibold text-[#6D28D9] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Co-Author
              </button>
            </div>

            <div className="space-y-2.5">
              {authors.map((author, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3"
                >
                  <span className="text-xs font-mono font-bold text-slate-400 w-5">
                    #{author.order}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Author Full Name"
                      value={author.name}
                      onChange={(e) => handleAuthorChange(index, 'name', e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Author Email"
                      value={author.email}
                      onChange={(e) => handleAuthorChange(index, 'email', e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                    />
                  </div>
                  {authors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAuthor(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-200/50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Document Upload (All Formats) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Research Manuscript (PDF, DOCX, PPTX & All Document Formats)
            </label>
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-[#6D28D9]/40 transition-colors bg-slate-50/50 flex flex-col items-center justify-center text-center">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                {existingFileName ? (
                  <span className="text-[#6D28D9] font-bold">
                    Selected ({getDocumentFormatLabel(existingFileName, fileMimeType)}): {existingFileName}
                  </span>
                ) : (
                  'Upload manuscript in any document format'
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports PDF, DOCX, DOC, PPTX, PPT, TXT, RTF, ODT, ODP, XLSX, MD & more. Max 25MB.
              </p>
              <input
                type="file"
                onChange={handleFileChange}
                className="mt-3 block text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#6D28D9] file:text-white hover:file:bg-[#5B21B6] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 pb-safe border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-3 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg sm:rounded-md cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('DRAFT')}
              className="min-h-[44px] sm:min-h-[36px] px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg sm:rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('PUBLISH')}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-lg sm:rounded-md transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Publish Paper
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
