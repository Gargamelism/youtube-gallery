'use client';

import { useRouter } from 'next/navigation';
import { User, LogOut, Settings } from 'lucide-react';

interface UserDropdownMenuProps {
  user: {
    first_name?: string;
    last_name?: string;
    username?: string;
    email?: string;
  } | null;
  isUserMenuOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
}

export default function UserDropdownMenu({ user, isUserMenuOpen, onToggle, onClose, onLogout }: UserDropdownMenuProps) {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div className="Navigation__user-menu ml-3 relative">
      <button
        onClick={onToggle}
        className="Navigation__user-button bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span className="sr-only">Open user menu</span>
        <div className="Navigation__avatar h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="Navigation__avatar-text text-white text-sm font-medium">
            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
          </span>
        </div>
      </button>

      {isUserMenuOpen && (
        <div className="Navigation__dropdown origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="Navigation__dropdown-content py-1">
            <div className="Navigation__user-info px-4 py-2 text-sm text-gray-700 border-b">
              <div className="Navigation__user-name font-medium">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="Navigation__user-email text-gray-500">{user?.email}</div>
            </div>

            <button
              onClick={() => handleNavigation('/profile')}
              className="Navigation__dropdown-item flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <User className="Navigation__dropdown-icon h-4 w-4 mr-3" />
              Profile
            </button>

            <button
              onClick={() => handleNavigation('/settings')}
              className="Navigation__dropdown-item flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Settings className="Navigation__dropdown-icon h-4 w-4 mr-3" />
              Settings
            </button>

            <button
              onClick={onLogout}
              className="Navigation__dropdown-item flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="Navigation__dropdown-icon h-4 w-4 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
