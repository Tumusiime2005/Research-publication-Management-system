import React, { useState, useMemo } from 'react';
import { AuditLog } from '../../types';
import { db } from '../../services/db';
import { X, History, Filter, Search } from 'lucide-react';

interface AuditLogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogViewerModal: React.FC<AuditLogViewerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const logs = useMemo(() => {
    return db.getAuditLogs();
  }, [isOpen]);

  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => set.add(l.action));
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchAction = filterAction === 'ALL' || l.action === filterAction;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        l.action.toLowerCase().includes(q) ||
        (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
        (l.metadata && l.metadata.toLowerCase().includes(q));
      return matchAction && matchSearch;
    });
  }, [logs, filterAction, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#6D28D9]" />
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">
                System Audit Trail & Compliance Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Immutable chronological log of all security, publication, and administrative activities.
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

        {/* Filter controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/30">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter Action:
            </span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            >
              <option value="ALL">All Actions ({logs.length})</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Log rows */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No audit logs match current filters.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4 font-mono text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#6D28D9]">{log.action}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 font-sans text-xs font-semibold">{log.entityType}</span>
                  </div>
                  <p className="font-sans text-xs text-slate-700">{log.metadata || 'N/A'}</p>
                  <p className="text-[11px] text-slate-400">
                    Actor: {log.actorEmail} · IP: {log.ipAddress}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-400 shrink-0 tabular-nums">
                  {new Date(log.createdAt).toLocaleTimeString()}
                  <br />
                  {new Date(log.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
