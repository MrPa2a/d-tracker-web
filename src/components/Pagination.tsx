import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface PaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  
  // Pour afficher le nombre total de pages et les raccourcis
  totalPages?: number;
  
  // Pour le mode "infinite scroll" où on ne connaît pas le total
  hasNextPage?: boolean;
  
  // Affichage du count (optionnel)
  totalCount?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  onPageChange,
  className = '',
  totalPages,
  totalCount,
  pageSize,
  onPageSizeChange,
  hasNextPage,
}) => {
  // Determine navigation state
  const canGoPrev = currentPage > 1;
  const canGoNext = hasNextPage !== undefined ? hasNextPage : (totalPages ? currentPage < totalPages : false);
  const showJumpButtons = totalPages && totalPages > 1;
  const showCount = totalCount !== undefined && pageSize !== undefined;

  // Don't render if there's nothing to show
  if (!canGoPrev && !canGoNext && !onPageSizeChange) return null;

  // Generate page numbers to show
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (!totalPages || totalPages <= 1) return [];
    
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = showCount ? (currentPage - 1) * pageSize! + 1 : 0;
  const endItem = showCount ? Math.min(currentPage * pageSize!, totalCount!) : 0;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {/* Left side - Info */}
      <div className="text-sm text-gray-400">
        {showCount ? (
          <>
            <span className="font-medium text-gray-200">{startItem}</span>
            {' - '}
            <span className="font-medium text-gray-200">{endItem}</span>
            {' sur '}
            <span className="font-medium text-gray-200">{totalCount!.toLocaleString('fr-FR')}</span>
          </>
        ) : totalPages ? (
          <>
            Page <span className="font-medium text-gray-200">{currentPage}</span> sur <span className="font-medium text-gray-200">{totalPages}</span>
          </>
        ) : (
          <>
            Page <span className="font-medium text-gray-200">{currentPage}</span>
          </>
        )}
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-1">
        {/* First page */}
        {showJumpButtons && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Première page"
          >
            <ChevronsLeft size={18} />
          </button>
        )}

        {/* Previous page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Page précédente"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Page numbers (only if we have totalPages) */}
        {pageNumbers.length > 0 && (
          <div className="flex items-center gap-1 mx-1">
            {pageNumbers.map((page, index) => (
              page === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-1.5 text-gray-500">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[28px] h-7 px-1.5 rounded text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>
        )}

        {/* Next page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Page suivante"
        >
          <ChevronRight size={18} />
        </button>

        {/* Last page */}
        {showJumpButtons && (
          <button
            onClick={() => onPageChange(totalPages!)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Dernière page"
          >
            <ChevronsRight size={18} />
          </button>
        )}

        {/* Page size selector */}
        {onPageSizeChange && pageSize && (
          <div className="ml-3 flex items-center gap-2 border-l border-white/10 pl-3">
            <span className="text-xs text-gray-500">Par page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-[#25262b] border border-white/10 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
