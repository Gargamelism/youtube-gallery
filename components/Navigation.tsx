'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings, Video, Users, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { logout } from '@/services/api'
import AuthModal from './auth/AuthModal'

export default function Navigation() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalView, setAuthModalView] = useState<'login' | 'register'>('login')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const { user, isAuthenticated, logout: logoutStore } = useAuthStore()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      logoutStore()
      setIsUserMenuOpen(false)
      router.push('/')
    }
  }

  const openAuthModal = (view: 'login' | 'register') => {
    setAuthModalView(view)
    setIsAuthModalOpen(true)
  }

  return (
    <>
      <nav className="Navigation bg-white shadow-lg border-b">
        <div className="Navigation__container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="Navigation__flex flex justify-between h-16">
            <div className="Navigation__left flex items-center">
              <div className="Navigation__logo flex-shrink-0">
                <h1 className="Navigation__title text-xl font-bold text-gray-900">
                  YouTube Gallery
                </h1>
              </div>

              {isAuthenticated && (
                <div className="Navigation__desktop-nav hidden md:ml-6 md:flex md:space-x-8">
                  <button
                    onClick={() => router.push('/videos')}
                    className="Navigation__nav-link inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300"
                  >
                    <Video className="Navigation__nav-icon h-4 w-4 mr-2" />
                    Videos
                  </button>
                  <button
                    onClick={() => router.push('/channels')}
                    className="Navigation__nav-link inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300"
                  >
                    <Users className="Navigation__nav-icon h-4 w-4 mr-2" />
                    Channels
                  </button>
                </div>
              )}
            </div>

            <div className="Navigation__right hidden md:ml-4 md:flex md:items-center">
              {isAuthenticated ? (
                <div className="Navigation__user-menu ml-3 relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
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
                          <div className="Navigation__user-name font-medium">{user?.first_name} {user?.last_name}</div>
                          <div className="Navigation__user-email text-gray-500">{user?.email}</div>
                        </div>
                        
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            router.push('/profile')
                          }}
                          className="Navigation__dropdown-item flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <User className="Navigation__dropdown-icon h-4 w-4 mr-3" />
                          Profile
                        </button>
                        
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            router.push('/settings')
                          }}
                          className="Navigation__dropdown-item flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Settings className="Navigation__dropdown-icon h-4 w-4 mr-3" />
                          Settings
                        </button>
                        
                        <button
                          onClick={handleLogout}
                          className="Navigation__dropdown-item flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <LogOut className="Navigation__dropdown-icon h-4 w-4 mr-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="Navigation__auth-buttons flex items-center space-x-4">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="Navigation__signin-button text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="Navigation__signup-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>

            <div className="Navigation__mobile-menu-button md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="Navigation__hamburger inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <X className="Navigation__close-icon h-6 w-6" />
                ) : (
                  <Menu className="Navigation__menu-icon h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="Navigation__mobile-menu md:hidden">
              <div className="Navigation__mobile-nav pt-2 pb-3 space-y-1 sm:px-3">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        router.push('/videos')
                      }}
                      className="Navigation__mobile-nav-item flex w-full items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <Video className="Navigation__mobile-nav-icon h-5 w-5 mr-3" />
                      Videos
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        router.push('/channels')
                      }}
                      className="Navigation__mobile-nav-item flex w-full items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <Users className="Navigation__mobile-nav-icon h-5 w-5 mr-3" />
                      Channels
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        openAuthModal('login')
                      }}
                      className="Navigation__mobile-signin block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        openAuthModal('register')
                      }}
                      className="Navigation__mobile-signup block w-full text-left px-3 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>

              {isAuthenticated && (
                <div className="Navigation__mobile-user-section pt-4 pb-3 border-t border-gray-200">
                  <div className="Navigation__mobile-user-info flex items-center px-4">
                    <div className="Navigation__mobile-avatar flex-shrink-0">
                      <div className="Navigation__mobile-avatar-circle h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="Navigation__mobile-avatar-text text-white text-sm font-medium">
                          {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="Navigation__mobile-user-details ml-3">
                      <div className="Navigation__mobile-user-name text-base font-medium text-gray-800">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div className="Navigation__mobile-user-email text-sm font-medium text-gray-500">{user?.email}</div>
                    </div>
                  </div>
                  <div className="Navigation__mobile-user-menu mt-3 space-y-1">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        router.push('/profile')
                      }}
                      className="Navigation__mobile-profile flex w-full items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    >
                      <User className="Navigation__mobile-profile-icon h-5 w-5 mr-3" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        router.push('/settings')
                      }}
                      className="Navigation__mobile-settings flex w-full items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    >
                      <Settings className="Navigation__mobile-settings-icon h-5 w-5 mr-3" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="Navigation__mobile-logout flex w-full items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    >
                      <LogOut className="Navigation__mobile-logout-icon h-5 w-5 mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {isUserMenuOpen && (
        <div
          className="Navigation__overlay fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultView={authModalView}
      />
    </>
  )
}