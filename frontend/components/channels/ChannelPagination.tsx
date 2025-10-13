'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChannelPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  paginationName: string;
  pageSize?: number;
}

export function ChannelPagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  paginationName,
  pageSize = 20,
}: ChannelPaginationProps) {
  const { t } = useTranslation('common');

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div
      className={`${paginationName}Pagination flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6`}
    >
      <div className={`${paginationName}Pagination__actions-wrapper flex flex-1 justify-between sm:hidden`}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${paginationName}Pagination__previous-page-button relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {t('previous')}
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${paginationName}Pagination__next-page-button relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {t('next')}
        </button>
      </div>

      <div
        className={`${paginationName}Pagination__info-wrapper hidden sm:flex sm:flex-1 sm:items-center sm:justify-between`}
      >
        <div>
          <p className={`${paginationName}Pagination__info text-sm text-gray-700`}>
            {t('pagination.showing')} <span className="font-medium">{startItem}</span> {t('pagination.to')}{' '}
            <span className="font-medium">{endItem}</span> {t('pagination.of')}{' '}
            <span className="font-medium">{totalCount}</span> {t('pagination.results')}
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label={t('pagination.navigation')}>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('pagination.previousPage')}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = getPageNumber(i, currentPage, totalPages);
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`${paginationName}Pagination__page-${pageNum}-button relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    pageNum === currentPage
                      ? 'z-10 bg-blue-600 text-white'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                  }`}
                  aria-label={`${t('pagination.page')} ${pageNum}${pageNum === currentPage ? ' (current)' : ''}`}
                  aria-current={pageNum === currentPage ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`${paginationName}Pagination__last-page-button relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={t('pagination.nextPage')}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

function getPageNumber(index: number, currentPage: number, totalPages: number): number {
  const maxStartPage = Math.max(1, totalPages - 4);
  const offset = Math.max(1, Math.min(currentPage - 2, maxStartPage));
  return offset + index;
}
