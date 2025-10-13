'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect, Suspense } from 'react';
import AuthProvider from './auth/components/AuthProvider';
import { ErrorBoundary } from '@/components/ui';
import '@/lib/i18n';
import { DEFAULT_QUERY_CONFIG } from '@/lib/reactQueryConfig';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: DEFAULT_QUERY_CONFIG,
      })
  );

  useEffect(() => {
    const handleClearCache = () => {
      queryClient.clear();
    };

    window.addEventListener('clear-react-query-cache', handleClearCache);
    return () => window.removeEventListener('clear-react-query-cache', handleClearCache);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorBoundary>
          <AuthProvider>
            {children}
            {process.env.NODE_ENV === 'development' && (
              <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
            )}
          </AuthProvider>
        </ErrorBoundary>
      </Suspense>
    </QueryClientProvider>
  );
}
