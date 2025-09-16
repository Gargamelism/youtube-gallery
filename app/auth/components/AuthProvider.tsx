'use client';

import { useEffect } from 'react';

import { navigateWithUpdatedParams } from '@/utils/urlHelpers';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthRequired = () => {
      navigateWithUpdatedParams(router, '/auth', searchParams, {
        returnUrl: window.location.pathname + window.location.search,
      });
    };

    window.addEventListener('auth-required', handleAuthRequired);

    return () => {
      window.removeEventListener('auth-required', handleAuthRequired);
    };
  }, []);

  return <>{children}</>;
}
