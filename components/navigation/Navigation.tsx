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

export default function Navigation() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const { user, isAuthenticated, logout: logoutStore } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logoutStore();
      setIsUserMenuOpen(false);
      queryClient.invalidateQueries();

      if (isProtectedRoute(pathname)) {
        router.push('/');
      }
    }
  };

  return (
    <nav className="Navigation bg-white shadow-lg border-b mb-4">
      <div className="Navigation__container max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="Navigation__flex flex items-center justify-around lg:justify-between">
          <div className="Navigation__left flex flex-col items-start lg:flex-row">
            <NavigationLogo />
            <NavigationLinks isAuthenticated={isAuthenticated} />
          </div>

          <div className="Navigation__right md:ml-4 md:flex md:items-center">
            {/* {isAuthenticated && ( */}
            <UserDropdownMenu
              user={user}
              isUserMenuOpen={isUserMenuOpen}
              onToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
              onClose={() => setIsUserMenuOpen(false)}
              onLogout={handleLogout}
            />
            {/* )} */}
          </div>
        </div>
      </div>
    </nav>
  );
}
