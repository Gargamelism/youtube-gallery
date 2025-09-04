'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useQueryClient } from '@tanstack/react-query';
import { AuthView, AuthViews } from '@components/navigation/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: AuthView;
}

export default function AuthModal({ isOpen, onClose, defaultView = AuthViews.LOGIN }: AuthModalProps) {
  const [currentView, setCurrentView] = useState<AuthView>(defaultView);
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleSuccess = () => {
    queryClient.invalidateQueries();
    onClose();
  };

  return (
    <div className="AuthModal fixed inset-0 z-50 overflow-y-auto">
      <div className="AuthModal__container flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="AuthModal__background fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <span className="AuthModal__central hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="AuthModal__content-container inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-0">
          <div className="AuthModal__close-wrapper absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="AuthModal__close-button bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="AuthModal__content p-6">
            {currentView === AuthViews.LOGIN ? (
              <LoginForm onSuccess={handleSuccess} onSwitchToRegister={() => setCurrentView(AuthViews.REGISTER)} />
            ) : (
              <RegisterForm onSuccess={handleSuccess} onSwitchToLogin={() => setCurrentView(AuthViews.LOGIN)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
