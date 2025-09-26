'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { fetchUserQuotaUsage } from '@/services';
import { QuotaIndicator } from '@/components/quota';
import { UserQuotaInfo } from '@/types';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useTranslation(['settings', 'quota', 'auth']);
  const { user } = useAuthStore();
  const [quotaInfo, setQuotaInfo] = useState<UserQuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuotaInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchUserQuotaUsage();

        if (response.error) {
          setError(response.error);
        } else {
          setQuotaInfo(response.data);
        }
      } catch (error) {
        console.error('Failed to load quota info:', error);
        setError(t('quota:loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadQuotaInfo();
    }
  }, [user, t]);

  if (!user) {
    return (
      <div className="SettingsPage max-w-4xl mx-auto px-4 py-8">
        <div className="SettingsPage__unauthorized text-center">
          <p className="text-gray-600">{t('auth:loginRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="SettingsPage max-w-4xl mx-auto px-4 py-8">
      <div className="SettingsPage__header mb-8">
        <h1 className="SettingsPage__title text-3xl font-bold text-gray-900 mb-2">
          {t('settings:title')}
        </h1>
        <p className="SettingsPage__subtitle text-gray-600">
          {t('settings:subtitle')}
        </p>
      </div>

      <div className="SettingsPage__content space-y-8">
        <section className="SettingsPage__quota-section">
          <h2 className="SettingsPage__section-title text-xl font-semibold text-gray-900 mb-4">
            {t('quota:title')}
          </h2>
          <p className="SettingsPage__section-description text-gray-600 mb-6">
            {t('quota:description')}
          </p>

          {isLoading ? (
            <div className="SettingsPage__loading flex items-center justify-center py-8">
              <Loader2 className="SettingsPage__loading-spinner h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-600">{t('quota:loading')}</span>
            </div>
          ) : error ? (
            <div className="SettingsPage__error bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : quotaInfo ? (
            <QuotaIndicator quotaInfo={quotaInfo} />
          ) : null}
        </section>

        <section className="SettingsPage__account-section">
          <h2 className="SettingsPage__section-title text-xl font-semibold text-gray-900 mb-4">
            {t('settings:account')}
          </h2>
          <div className="SettingsPage__account-info bg-gray-50 rounded-lg p-6">
            <div className="SettingsPage__account-field mb-4">
              <label className="SettingsPage__field-label block text-sm font-medium text-gray-700">
                {t('auth:email')}
              </label>
              <p className="SettingsPage__field-value text-gray-900">{user.email}</p>
            </div>
            <div className="SettingsPage__account-field mb-4">
              <label className="SettingsPage__field-label block text-sm font-medium text-gray-700">
                {t('auth:username')}
              </label>
              <p className="SettingsPage__field-value text-gray-900">{user.username}</p>
            </div>
            <div className="SettingsPage__account-field">
              <label className="SettingsPage__field-label block text-sm font-medium text-gray-700">
                {t('auth:fullName')}
              </label>
              <p className="SettingsPage__field-value text-gray-900">
                {user.first_name} {user.last_name}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}