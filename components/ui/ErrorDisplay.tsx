'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorDisplayProps {
  error: Error | unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, className = '' }: ErrorDisplayProps) {
  const { t } = useTranslation('common');

  const errorMessage = error instanceof Error ? error.message : t('error');

  return (
    <div
      className={`ErrorDisplay bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="ErrorDisplay__content flex items-start">
        <AlertCircle className="ErrorDisplay__icon h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="ErrorDisplay__message-wrapper flex-1">
          <h3 className="ErrorDisplay__title text-sm font-medium text-red-800 mb-1">{t('errorOccurred')}</h3>
          <p className="ErrorDisplay__message text-sm text-red-700">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ErrorDisplay__retry-button mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {t('retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}