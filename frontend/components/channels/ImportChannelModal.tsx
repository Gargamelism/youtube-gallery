import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { importChannelFromYoutube, getYouTubeAuthUrl, QuotaExceededError } from '@/services';
import { Loader2 } from 'lucide-react';
import { useChannelSubscribe } from './mutations';
import { handleKeyboardActivation } from '../utils/keyboardUtils';
import { useQueryClient } from '@tanstack/react-query';
import { QuotaIndicator } from '@/components/quota';
import { UserQuotaInfo } from '@/types';
import { usePostMessage, PostMessageType } from '@/hooks/usePostMessage';
import { queryKeys } from '@/lib/reactQueryConfig';

export interface ImportChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportChannelModal({ isOpen, onClose }: ImportChannelModalProps) {
  const { t } = useTranslation('channels');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null | undefined>(null);
  const [newChannelId, setNewChannelId] = useState('');
  const [needsYoutubeAuth, setNeedsYoutubeAuth] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<UserQuotaInfo | null>(null);
  const queryClient = useQueryClient();
  const subscribeMutation = useChannelSubscribe(queryClient);
  const modalRef = useRef<HTMLDivElement>(null);
  const pendingChannelId = useRef<string>('');

  const handleAuthMessage = async (event: MessageEvent) => {
    if (event.data === PostMessageType.YOUTUBE_AUTH_SUCCESS) {
      setNeedsYoutubeAuth(false);
      setImportError(null);

      // Retry with stored channel ID
      if (pendingChannelId.current) {
        setIsImporting(true);

        try {
          const response = await importChannelFromYoutube(pendingChannelId.current);

          if (response.error) {
            setImportError(response.error);
          } else {
            await subscribeMutation.mutateAsync(response.data.uuid);
            queryClient.invalidateQueries({ queryKey: queryKeys.userQuota });
            setNewChannelId('');
            onClose();
          }
        } catch (error) {
          if (error instanceof QuotaExceededError) {
            setImportError(error.message);
            setQuotaInfo(error.quotaInfo.quota_info);
          } else {
            setImportError(t('import.error'));
          }
          console.error('Import error:', error);
        } finally {
          setIsImporting(false);
          pendingChannelId.current = '';
        }
      }
    }
  };

  usePostMessage(handleAuthMessage);

  useEffect(() => {
    const handleYoutubeAuthRequired = (event: CustomEvent) => {
      setNeedsYoutubeAuth(true);
      setImportError(event.detail.message);
      setIsImporting(false);
    };

    window.addEventListener('youtube-auth-required', handleYoutubeAuthRequired as EventListener);

    return () => {
      window.removeEventListener('youtube-auth-required', handleYoutubeAuthRequired as EventListener);
    };
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      const modalElement = modalRef.current;
      if (modalElement) {
        modalElement.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleYoutubeAuth = async () => {
    try {
      const { getYouTubeCallbackUrl } = await import('@/lib/config');
      const redirectUri = getYouTubeCallbackUrl();
      const response = await getYouTubeAuthUrl(redirectUri, window.location.href);

      if (response.error) {
        setImportError(`${t('import.authenticationFailed')} ${response.error}`);
      } else if (response.data.auth_url) {
        window.location.href = response.data.auth_url;
      } else {
        setImportError(t('import.failedToGetAuthUrl'));
      }
    } catch {
      setImportError(t('import.failedToStartAuth'));
    }
  };

  const handleImportChannel = async () => {
    if (!newChannelId.trim()) return;

    setIsImporting(true);
    setImportError(null);
    setNeedsYoutubeAuth(false);
    setQuotaInfo(null);

    try {
      const response = await importChannelFromYoutube(newChannelId);

      if (response.youtubeAuthRequired) {
        pendingChannelId.current = newChannelId;
        setNeedsYoutubeAuth(true);
        setImportError(response.error);
      } else if (response.error) {
        setImportError(response.error);
      } else {
        await subscribeMutation.mutateAsync(response.data.uuid);
        queryClient.invalidateQueries({ queryKey: queryKeys.userQuota });
        setNewChannelId('');
        onClose();
      }
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        setImportError(error.message);
        setQuotaInfo(error.quotaInfo.quota_info);
      } else {
        setImportError(t('import.error'));
      }
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="ChannelSubscriptions__modal fixed inset-0 z-50 overflow-y-auto"
      tabIndex={-1}
      ref={modalRef}
      onKeyDown={() => handleKeyboardActivation(handleImportChannel)}
    >
      <div className="ChannelSubscriptions__modal-overlay flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="ChannelSubscriptions__modal-backdrop fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="ChannelSubscriptions__modal-content inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="ChannelSubscriptions__modal-header mb-4">
            <h3 className="ChannelSubscriptions__modal-title text-lg font-medium text-gray-900">{t('import.title')}</h3>
            <p className="ChannelSubscriptions__modal-description text-sm text-gray-500 mt-1">
              {t('import.description')}
            </p>
          </div>

          {importError && (
            <div className="ChannelSubscriptions__error bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
              {importError}
              {needsYoutubeAuth && (
                <button
                  onClick={handleYoutubeAuth}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  {t('import.authenticateWithYoutube')}
                </button>
              )}
            </div>
          )}

          {quotaInfo && (
            <div className="ChannelSubscriptions__quota-info mb-4">
              <QuotaIndicator quotaInfo={quotaInfo} />
            </div>
          )}

          <div className="ChannelSubscriptions__modal-form">
            <label
              htmlFor="channelId"
              className="ChannelSubscriptions__form-label block text-sm font-medium text-gray-700 mb-2"
            >
              {t('import.channelId')}
            </label>
            <input
              type="text"
              id="channelId"
              value={newChannelId}
              onChange={e => setNewChannelId(e.target.value)}
              placeholder={t('import.channelIdPlaceholder')}
              className="ChannelSubscriptions__form-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="ChannelSubscriptions__form-help text-xs text-gray-500 mt-1">{t('import.channelIdHelp')}</p>
          </div>

          <div className="ChannelSubscriptions__modal-actions flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="ChannelSubscriptions__cancel-button px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('common:cancel')}
            </button>
            <button
              onClick={handleImportChannel}
              onKeyDown={handleKeyboardActivation(handleImportChannel)}
              disabled={isImporting || !newChannelId.trim()}
              className="ChannelSubscriptions__import-button flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="ChannelSubscriptions__import-spinner h-4 w-4 mr-2 animate-spin" />
                  {t('import.importing')}
                </>
              ) : (
                t('import.importSubscribe')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
