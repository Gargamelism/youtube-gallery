'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getYouTubeAuthUrl } from '@/services';
import { X, AlertCircle } from 'lucide-react';
import { usePostMessage, PostMessageType } from '@/hooks/usePostMessage';

export function YouTubeAuthBanner() {
  const { t } = useTranslation('auth');
  const [isVisible, setIsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAuthMessage = (event: MessageEvent) => {
    if (event.data === PostMessageType.YOUTUBE_AUTH_SUCCESS) {
      setIsVisible(false);
      setErrorMessage('');
      setIsAuthenticating(false);
    }
  };

  usePostMessage(handleAuthMessage);

  useEffect(() => {
    const handleYoutubeAuthRequired = (event: CustomEvent) => {
      setIsVisible(true);
      setErrorMessage(event.detail?.message || '');
      setIsAuthenticating(false);
    };

    window.addEventListener('youtube-auth-required', handleYoutubeAuthRequired as EventListener);

    return () => {
      window.removeEventListener('youtube-auth-required', handleYoutubeAuthRequired as EventListener);
    };
  }, []);

  const handleReconnect = async () => {
    setIsAuthenticating(true);

    try {
      const { getYouTubeCallbackUrl } = await import('@/lib/config');
      const redirectUri = getYouTubeCallbackUrl();
      const response = await getYouTubeAuthUrl(redirectUri, window.location.href);

      if (response.error) {
        setErrorMessage(`${t('youtubeAuthBanner.authenticationFailed')} ${response.error}`);
        setIsAuthenticating(false);
      } else if (response.data.auth_url) {
        window.location.href = response.data.auth_url;
      } else {
        setErrorMessage(t('youtubeAuthBanner.failedToGetAuthUrl'));
        setIsAuthenticating(false);
      }
    } catch {
      setErrorMessage(t('youtubeAuthBanner.failedToStartAuth'));
      setIsAuthenticating(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isMounted || !isVisible) return null;

  return (
    <div className="YouTubeAuthBanner fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b-2 border-amber-200 shadow-md">
      <div className="YouTubeAuthBanner__container max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="YouTubeAuthBanner__content flex items-center justify-between gap-4">
          <div className="YouTubeAuthBanner__message-section flex items-center gap-3 flex-1 min-w-0">
            <AlertCircle className="YouTubeAuthBanner__icon h-5 w-5 text-amber-600 flex-shrink-0" aria-hidden="true" />
            <div className="YouTubeAuthBanner__text flex-1 min-w-0">
              <p className="YouTubeAuthBanner__title text-sm font-medium text-amber-900">
                {t('youtubeAuthBanner.title')}
              </p>
              <p className="YouTubeAuthBanner__description text-sm text-amber-700 mt-0.5">
                {t('youtubeAuthBanner.message')}
              </p>
              {errorMessage && <p className="YouTubeAuthBanner__error text-xs text-amber-600 mt-1">{errorMessage}</p>}
            </div>
          </div>

          <div className="YouTubeAuthBanner__actions flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleReconnect}
              disabled={isAuthenticating}
              className="YouTubeAuthBanner__reconnect-button inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={t('youtubeAuthBanner.reconnectButton')}
            >
              {isAuthenticating ? t('youtubeAuthBanner.reconnecting') : t('youtubeAuthBanner.reconnectButton')}
            </button>

            <button
              onClick={handleDismiss}
              className="YouTubeAuthBanner__dismiss-button inline-flex items-center p-2 border border-transparent rounded-md text-amber-700 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              aria-label={t('youtubeAuthBanner.dismiss')}
            >
              <X className="YouTubeAuthBanner__dismiss-icon h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
