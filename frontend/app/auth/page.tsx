'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getReturnUrl } from '@/utils/urlHelpers';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import { AuthViews } from '@/components/navigation/types';

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [returnUrl] = useState(() => getReturnUrl(searchParams));
  const [currentView, setCurrentView] = useState<typeof AuthViews.LOGIN | typeof AuthViews.REGISTER>(AuthViews.LOGIN);

  const handleSuccess = () => {
    router.push(returnUrl || '/');
  };

  const handleSwitchToRegister = () => {
    setCurrentView(AuthViews.REGISTER);
  };

  const handleSwitchToLogin = () => {
    setCurrentView(AuthViews.LOGIN);
  };

  if (isAuthenticated) {
    return null;
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
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
