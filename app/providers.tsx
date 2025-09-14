'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import AuthProvider from '@/components/auth/AuthProvider';
import '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    const handleClearCache = () => {
      queryClient.clear();
    };

    window.addEventListener('clear-react-query-cache', handleClearCache);
    return () => window.removeEventListener('clear-react-query-cache', handleClearCache);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
