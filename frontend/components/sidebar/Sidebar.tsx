'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Video, TvMinimalPlay, User, Settings, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { logout } from '@/services';
import { isProtectedRoute, APP_ROUTES } from '@/config/routes';
import { useQueryClient } from '@tanstack/react-query';
import { storage } from '@/lib/storage';
import { useChannelTags } from '@/components/tags/mutations';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { ChannelTag } from '@/types';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

interface NavLink {
  nameKey: string;
  path: string;
  icon: React.ElementType;
}

const NAV_LINKS: NavLink[] = [
  { nameKey: 'videos', path: APP_ROUTES.videos, icon: Video },
  { nameKey: 'channels', path: APP_ROUTES.channels, icon: TvMinimalPlay },
];

function TagDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

interface SidebarTagSectionProps {
  isCollapsed: boolean;
  allTags: ChannelTag[];
}

function SidebarTagSection({ isCollapsed, allTags }: SidebarTagSectionProps) {
  const { addTag } = useVideoFilters();
  const { t } = useTranslation('navigation');

  if (allTags.length === 0) return null;

  return (
    <div className="Sidebar__tags mt-6">
      {!isCollapsed && (
        <p className="Sidebar__tags-label text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
          {t('tags')}
        </p>
      )}
      <ul className="Sidebar__tags-list space-y-1">
        {allTags.map(tag => (
          <li key={tag.id}>
            <button
              onClick={() => addTag(tag.name)}
              className="Sidebar__tag-item w-full flex items-center gap-3 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title={isCollapsed ? tag.name : undefined}
            >
              <TagDot color={tag.color} />
              {!isCollapsed && <span className="truncate">{tag.name}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarTagSectionWrapper({ isCollapsed }: { isCollapsed: boolean }) {
  const { data: tagsData } = useChannelTags();
  const allTags = tagsData?.results ?? [];

  return <SidebarTagSection isCollapsed={isCollapsed} allTags={allTags} />;
}

interface UserMenuProps {
  user: { first_name?: string; last_name?: string; username?: string; email?: string } | null;
  isCollapsed: boolean;
  onLogout: () => void;
}

function UserMenu({ user, isCollapsed, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation('navigation');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const initials = user?.first_name?.[0] || user?.username?.[0] || 'U';
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '';

  return (
    <div className="Sidebar__user relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="Sidebar__user-button w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
        title={isCollapsed ? displayName : undefined}
      >
        <div className="Sidebar__avatar h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-medium">{initials}</span>
        </div>
        {!isCollapsed && (
          <div className="Sidebar__user-info text-left overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`Sidebar__user-dropdown absolute z-50 bottom-full mb-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 ${
              isCollapsed ? 'left-full ml-2' : 'left-4'
            }`}
          >
            <div className="py-1">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                <p className="font-medium truncate">{displayName}</p>
                <p className="text-gray-500 text-xs truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push(APP_ROUTES.profile);
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <User className="h-4 w-4 mr-3" />
                {t('profile')}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push(APP_ROUTES.settings);
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="h-4 w-4 mr-3" />
                {t('settings')}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4 mr-3" />
                {t('signOut')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, logout: logoutStore } = useAuthStore();
  const { t } = useTranslation('navigation');

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  const handleToggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logoutStore();
      storage.clearAll();
      queryClient.clear();
      if (isProtectedRoute(pathname)) {
        router.push('/');
      }
    }
  };

  const isOnVideosPage = pathname === '/videos';

  return (
    <aside
      className={`Sidebar flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-200 flex-shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo / Header */}
      <div className="Sidebar__header flex items-center justify-between px-4 py-5 border-b border-gray-100">
        {!isCollapsed && (
          <button onClick={() => router.push(APP_ROUTES.home)} className="text-left">
            <p className="Sidebar__title text-base font-bold text-gray-900 leading-tight">{t('appName')}</p>
            <p className="Sidebar__subtitle text-xs text-gray-500">{t('videoManagement')}</p>
          </button>
        )}
        <button
          onClick={handleToggleCollapse}
          className="Sidebar__collapse-btn p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="Sidebar__nav flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {NAV_LINKS.map(link => {
            const isActive = pathname === link.path;
            const Icon = link.icon;
            const label = t(link.nameKey);
            return (
              <li key={link.path}>
                <button
                  onClick={() => router.push(link.path)}
                  className={`Sidebar__nav-link w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 border-l-2 border-purple-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={isCollapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>{label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Tags — only on videos page */}
        {isOnVideosPage && isAuthenticated && (
          <Suspense fallback={null}>
            <SidebarTagSectionWrapper isCollapsed={isCollapsed} />
          </Suspense>
        )}
      </nav>

      {/* User menu */}
      {isAuthenticated && (
        <div className="Sidebar__footer border-t border-gray-100">
          <UserMenu user={user} isCollapsed={isCollapsed} onLogout={handleLogout} />
        </div>
      )}
    </aside>
  );
}
