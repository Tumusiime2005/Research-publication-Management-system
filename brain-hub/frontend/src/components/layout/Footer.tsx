import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-[#1E1B4B] tracking-tight">BRAIN HUB</span>
            <span>·</span>
            <span>Open Research Publication Management System</span>
            <span>·</span>
            <span>Peer-Reviewed Academic Commons</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-xs">
            <span className="font-bold text-[#6D28D9] tracking-wide">
              MARON PRIME THE LEGENDARY SYSTEMS ANALYST
            </span>
            <span className="hidden sm:inline text-slate-300">·</span>
            <span className="font-mono font-semibold text-slate-700 tabular-nums">
              +256 769849051
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
