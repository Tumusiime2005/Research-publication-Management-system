import React, { useState, useMemo } from 'react';
import { Publication } from '../../types';
import { getDocumentFormatLabel } from '../../services/utils';
import { Search, Filter, BookOpen, Users, ExternalLink, Layers } from 'lucide-react';

interface PublicCatalogProps {
  publications: Publication[];
  onSelectPublication: (publication: Publication) => void;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({
  publications,
  onSelectPublication,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Show all published papers (APPROVED)
  const publishedList = useMemo(() => {
    return publications.filter(p => p.status === 'APPROVED');
  }, [publications]);

  // Unique domain categories with counts, sorted alphabetically
  const domainCategories = useMemo(() => {
    const counts = new Map<string, number>();
    publishedList.forEach((p) => {
      const domain = p.researchArea?.trim() || 'General Research';
      counts.set(domain, (counts.get(domain) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [publishedList]);

  // Filter & Search
  const filteredPublications = useMemo(() => {
    return publishedList
      .filter((p) => {
        const domain = p.researchArea?.trim() || 'General Research';
        const matchesArea =
          selectedArea === 'ALL' || domain.toLowerCase() === selectedArea.toLowerCase();
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.abstractText.toLowerCase().includes(q) ||
          domain.toLowerCase().includes(q) ||
          p.keywords.toLowerCase().includes(q) ||
          p.authors.some(a => a.authorName.toLowerCase().includes(q));
        return matchesArea && matchesQuery;
      })
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(a.createdAt).getTime();
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : new Date(b.createdAt).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [publishedList, selectedArea, searchQuery, sortOrder]);

  // Group filtered papers strictly by domain category so same-domain papers sort together into one category
  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, Publication[]>();
    filteredPublications.forEach((pub) => {
      const domain = pub.researchArea?.trim() || 'General Research';
      if (!groups.has(domain)) {
        groups.set(domain, []);
      }
      groups.get(domain)!.push(pub);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredPublications]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#6D28D9] mb-3">
            <span>Open Access Academic Commons</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-500">
              {publishedList.length} {publishedList.length === 1 ? 'Paper' : 'Papers'} across {domainCategories.length} {domainCategories.length === 1 ? 'Domain' : 'Domains'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1B4B] tracking-tight leading-tight">
            Academic Research & Domain Repository
          </h1>

          <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
            Explore research papers organized automatically into shared academic domains submitted by verified researchers worldwide.
          </p>

          {/* Search bar */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by paper title, domain (e.g. Distributional Systems), keywords, or author..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Decorative powder blue corner glow */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-[#B0D9F2]/20 to-transparent pointer-events-none" />
      </div>

      {/* Domain Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Domain Categories:
        </span>
        <button
          onClick={() => setSelectedArea('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
            selectedArea === 'ALL'
              ? 'bg-[#6D28D9] text-white'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          All Categories ({publishedList.length})
        </button>
        {domainCategories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedArea(cat.name)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
              selectedArea === cat.name
                ? 'bg-[#6D28D9] text-white'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Category-Grouped Publication Sections */}
      {groupedByCategory.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            {publishedList.length === 0
              ? 'No Published Papers in Repository Yet'
              : 'No Publications Match Current Filters'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            {publishedList.length === 0
              ? 'Verified researchers can publish research papers directly under any domain category.'
              : 'Try clearing search keywords or switching domain categories.'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedByCategory.map(([domainName, categoryPapers]) => (
            <section key={domainName} className="space-y-4">
              {/* Category Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-[#1E1B4B] tracking-tight">
                      {domainName}
                    </h2>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#B0D9F2]/40 text-[#1E1B4B] tabular-nums">
                  {categoryPapers.length} {categoryPapers.length === 1 ? 'Paper' : 'Papers'}
                </span>
              </div>

              {/* Cards inside this Domain Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {categoryPapers.map((pub) => (
                  <div
                    key={pub.id}
                    onClick={() => onSelectPublication(pub)}
                    className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col justify-between hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span className="font-semibold text-[#6D28D9]">{pub.researchArea}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {new Date(pub.publishedAt || pub.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {pub.documentOriginalName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-400">
                              {getDocumentFormatLabel(pub.documentOriginalName, pub.documentMimeType)} Available
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#1E1B4B] group-hover:text-[#6D28D9] transition-colors leading-snug line-clamp-2">
                        {pub.title}
                      </h3>

                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed">
                        {pub.abstractText}
                      </p>
                    </div>

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
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
