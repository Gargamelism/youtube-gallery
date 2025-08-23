'use client'

import { useEffect, useState } from 'react'
import AuthModal from './AuthModal'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    const handleAuthRequired = () => {
      setShowAuthModal(true)
    }

    window.addEventListener('auth-required', handleAuthRequired)

    return () => {
      window.removeEventListener('auth-required', handleAuthRequired)
    }
  }, [])

  const handleCloseAuthModal = () => {
    setShowAuthModal(false)
  }

  return (
    <>
      {children}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={handleCloseAuthModal}
        defaultView="login"
      />
    </>
  )
}