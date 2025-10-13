'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { logout } from '@/services';
import { isProtectedRoute } from '@/config/routes';
import NavigationLogo from './NavigationLogo';
import NavigationLinks from './NavigationLinks';
import UserDropdownMenu from './UserDropdownMenu';
import { useQueryClient } from '@tanstack/react-query';
import { storage } from '@/lib/storage';
import { useScrollDirection, ScrollDirection } from '@/hooks/useScrollDirection';

export default function Navigation() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();

  const { user, isAuthenticated, logout: logoutStore } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logoutStore();
      storage.clearAll();
      setIsUserMenuOpen(false);
      queryClient.clear();

      if (isProtectedRoute(pathname)) {
        router.push('/');
      }
    }
  };

  const shouldHideNav = scrollDirection === ScrollDirection.DOWN;

  return (
    <nav
      className={`Navigation bg-white shadow-lg border-b mb-4 sticky top-0 z-40 transition-transform duration-300 ${
        shouldHideNav ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="Navigation__container max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="Navigation__flex flex items-center justify-around lg:justify-between">
          <div className="Navigation__left flex flex-col items-start lg:flex-row">
            <NavigationLogo />
            <NavigationLinks isAuthenticated={isAuthenticated} />
          </div>

          <div className="Navigation__right md:ml-4 md:flex md:items-center">
            <UserDropdownMenu
              user={user}
              isUserMenuOpen={isUserMenuOpen}
              onToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
              onClose={() => setIsUserMenuOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
