'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { sanitizeReturnUrl } from '@/utils/urlHelpers';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import { AuthViews } from '@/components/navigation/types';

function AuthLoading() {
  const { t } = useTranslation('auth');
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center">{t('loading')}</div>;
}

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [rawReturnUrl] = useState(() => searchParams.get('returnUrl'));
  const hasReturnUrl = rawReturnUrl !== null;
  const returnUrl = sanitizeReturnUrl(rawReturnUrl);
  const [currentView, setCurrentView] = useState<typeof AuthViews.LOGIN | typeof AuthViews.REGISTER>(AuthViews.LOGIN);

  // Middleware only forwards users to /auth?returnUrl=... when the auth cookie is missing.
  // If the persisted store still claims authenticated, the client state is stale — reconcile it.
  // Otherwise, an authenticated user landed here directly and should be sent home.
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (hasReturnUrl) {
      logout();
    } else {
      router.replace('/');
    }
  }, [isAuthenticated, hasReturnUrl, logout, router]);

  const handleSuccess = () => {
    router.push(returnUrl || '/');
  };

  const handleSwitchToRegister = () => {
    setCurrentView(AuthViews.REGISTER);
  };

  const handleSwitchToLogin = () => {
    setCurrentView(AuthViews.LOGIN);
  };

  if (isAuthenticated && !hasReturnUrl) {
    return <AuthLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {currentView === AuthViews.LOGIN ? (
          <LoginForm onSuccess={handleSuccess} onSwitchToRegister={handleSwitchToRegister} />
        ) : (
          <RegisterForm onSuccess={handleSuccess} onSwitchToLogin={handleSwitchToLogin} />
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthContent />
    </Suspense>
  );
}
