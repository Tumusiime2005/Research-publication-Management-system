import React, { useState, useMemo } from 'react';
import { Publication } from '../../types';
import { Search, Filter, BookOpen, Download, Calendar, Users, ExternalLink, Sparkles } from 'lucide-react';

interface PublicCatalogProps {
  publications: Publication[];
  onSelectPublication: (publication: Publication) => void;
  onOpenSeedCorpus?: () => void;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({
  publications,
  onSelectPublication,
  onOpenSeedCorpus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter strictly APPROVED publications
  const approvedList = useMemo(() => {
    return publications.filter(p => p.status === 'APPROVED');
  }, [publications]);

  // Extract unique research areas
  const researchAreas = useMemo(() => {
    const set = new Set<string>();
    approvedList.forEach(p => {
      if (p.researchArea) set.add(p.researchArea);
    });
    return Array.from(set);
  }, [approvedList]);

  // Filter & Search
  const filteredPublications = useMemo(() => {
    return approvedList
      .filter(p => {
        const matchesArea = selectedArea === 'ALL' || p.researchArea === selectedArea;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.abstractText.toLowerCase().includes(q) ||
          p.keywords.toLowerCase().includes(q) ||
          p.authors.some(a => a.authorName.toLowerCase().includes(q));
        return matchesArea && matchesQuery;
      })
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [approvedList, selectedArea, searchQuery, sortOrder]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#6D28D9] mb-3">
            <span>Official Peer-Reviewed Repository</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-500">
              {approvedList.length} Verified Papers
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1B4B] tracking-tight leading-tight">
            Peer-Reviewed Academic Discoveries and Publications
          </h1>

          <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
            Explore verified research papers reviewed and validated by institutional editorial boards.
            Open Access distribution with complete author attribution and verification notes.
          </p>

          {/* Search bar */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by publication title, keywords, authors, or abstract..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Decorative subtle powder blue glow in corner */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-[#B0D9F2]/20 to-transparent pointer-events-none" />
      </div>

      {/* Segmented Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Discipline:
        </span>
        <button
          onClick={() => setSelectedArea('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
            selectedArea === 'ALL'
              ? 'bg-[#6D28D9] text-white'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          All Domains ({approvedList.length})
        </button>
        {researchAreas.map((area) => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
              selectedArea === area
                ? 'bg-[#6D28D9] text-white'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {area}
          </button>
        ))}
      </div>

      {/* Publication Cards Grid */}
      {filteredPublications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            {approvedList.length === 0
              ? 'No Approved Publications in Database'
              : 'No Publications Match Current Filters'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            {approvedList.length === 0
              ? 'Publications submitted by researchers must be reviewed and approved by an administrator before appearing publicly.'
              : 'Try clearing search keywords or resetting discipline filters.'}
          </p>

          {approvedList.length === 0 && onOpenSeedCorpus && (
            <div className="mt-5">
              <button
                onClick={onOpenSeedCorpus}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-all shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Seed Peer-Reviewed Demo Corpus
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPublications.map((pub) => {
            const firstReview = pub.reviews && pub.reviews.length > 0 ? pub.reviews[0] : null;
            return (
              <div
                key={pub.id}
                onClick={() => onSelectPublication(pub)}
                className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col justify-between hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div>
                  {/* Clean unboxed metadata kicker */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-[#6D28D9]">{pub.researchArea}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {pub.publishedAt
                        ? new Date(pub.publishedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Published'}
                    </span>
                    {pub.documentOriginalName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-400">PDF Available</span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#1E1B4B] group-hover:text-[#6D28D9] transition-colors leading-snug line-clamp-2">
                    {pub.title}
                  </h3>

                  {/* Abstract Preview */}
                  <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed">
                    {pub.abstractText}
                  </p>
                </div>

                {/* Footer details */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600 truncate max-w-[70%]">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">
                      {pub.authors.map(a => a.authorName).join(', ')}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-[#6D28D9] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0">
                    Read Paper <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
