'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWatchPreferences, updateWatchPreferences } from '@/services/auth';
import { WatchPreferencesResponse, WatchPreferencesUpdateRequest } from '@/types';
import { WATCH_PREFERENCES_CONFIG, queryKeys } from '@/lib/reactQueryConfig';
import {
  DEFAULT_AUTO_MARK_ENABLED,
  DEFAULT_AUTO_MARK_THRESHOLD,
  MIN_AUTO_MARK_THRESHOLD,
  MAX_AUTO_MARK_THRESHOLD,
  AUTO_MARK_THRESHOLD_STEP,
} from '@/lib/watchPreferencesConstants';
import { Loader2, RotateCcw, Save, X } from 'lucide-react';

export function WatchPreferencesSection() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  const {
    data: preferences,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.watchPreferences,
    queryFn: getWatchPreferences,
    select: response => response.data,
    ...WATCH_PREFERENCES_CONFIG,
  });

  const { mutateAsync: updatePreferences, isPending: isUpdating } = useMutation({
    mutationFn: async (newPreferences: WatchPreferencesUpdateRequest) => {
      const response = await updateWatchPreferences(newPreferences);
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to update watch preferences');
      }
      return response.data;
    },
    onSuccess: (data: WatchPreferencesResponse) => {
      queryClient.setQueryData(queryKeys.watchPreferences, {
        success: true,
        data: {
          auto_mark_watched_enabled: data.auto_mark_watched_enabled,
          auto_mark_threshold: data.auto_mark_threshold,
        },
        error: null,
      });
    },
  });

  const [localAutoMarkEnabled, setLocalAutoMarkEnabled] = useState<boolean>(DEFAULT_AUTO_MARK_ENABLED);
  const [localThreshold, setLocalThreshold] = useState<number>(DEFAULT_AUTO_MARK_THRESHOLD);

  useEffect(() => {
    if (preferences) {
      setLocalAutoMarkEnabled(preferences.auto_mark_watched_enabled);
      setLocalThreshold(preferences.auto_mark_threshold);
    }
  }, [preferences]);

  const hasChanges =
    preferences &&
    (localAutoMarkEnabled !== preferences.auto_mark_watched_enabled ||
      localThreshold !== preferences.auto_mark_threshold);

  const handleToggleAutoMark = () => {
    setLocalAutoMarkEnabled(prev => !prev);
  };

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseInt(event.target.value, 10);
    setLocalThreshold(newThreshold);
  };

  const handleSaveChanges = async () => {
    try {
      await updatePreferences({
        auto_mark_watched_enabled: localAutoMarkEnabled,
        auto_mark_threshold: localThreshold,
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleCancel = () => {
    if (preferences) {
      setLocalAutoMarkEnabled(preferences.auto_mark_watched_enabled);
      setLocalThreshold(preferences.auto_mark_threshold);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      await updatePreferences({
        auto_mark_watched_enabled: DEFAULT_AUTO_MARK_ENABLED,
        auto_mark_threshold: DEFAULT_AUTO_MARK_THRESHOLD,
      });
    } catch (error) {
      console.error('Failed to reset to defaults:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="WatchPreferencesSection__loading flex items-center justify-center py-8">
        <Loader2 className="WatchPreferencesSection__loading-spinner h-6 w-6 animate-spin mr-2" />
        <span className="text-gray-600">{t('loading')}</span>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="WatchPreferencesSection__error bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {t('watchPreferences.loadError')}
      </div>
    );
  }

  return (
    <div className="WatchPreferencesSection space-y-6">
      <div className="WatchPreferencesSection__auto-mark bg-gray-50 rounded-lg p-6">
        <div className="WatchPreferencesSection__toggle-container flex items-start justify-between">
          <div className="WatchPreferencesSection__toggle-info flex-1">
            <h3 className="WatchPreferencesSection__toggle-title text-base font-medium text-gray-900 mb-1">
              {t('watchPreferences.autoMarkTitle')}
            </h3>
            <p className="WatchPreferencesSection__toggle-description text-sm text-gray-600">
              {t('watchPreferences.autoMarkDescription')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={localAutoMarkEnabled}
            onClick={handleToggleAutoMark}
            disabled={isUpdating}
            className={`WatchPreferencesSection__toggle relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              localAutoMarkEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`WatchPreferencesSection__toggle-slider pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                localAutoMarkEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {localAutoMarkEnabled && (
        <div className="WatchPreferencesSection__threshold bg-gray-50 rounded-lg p-6">
          <label className="WatchPreferencesSection__threshold-label block">
            <div className="WatchPreferencesSection__threshold-header flex items-baseline justify-between mb-2">
              <span className="text-base font-medium text-gray-900">{t('watchPreferences.thresholdTitle')}</span>
              <span className="text-2xl font-semibold text-blue-600">{localThreshold}%</span>
            </div>
            <p className="WatchPreferencesSection__threshold-description text-sm text-gray-600 mb-4">
              {t('watchPreferences.thresholdDescription')}
            </p>
            <input
              type="range"
              min={MIN_AUTO_MARK_THRESHOLD}
              max={MAX_AUTO_MARK_THRESHOLD}
              step={AUTO_MARK_THRESHOLD_STEP}
              value={localThreshold}
              onChange={handleThresholdChange}
              disabled={isUpdating}
              className="WatchPreferencesSection__threshold-slider w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-600"
            />
            <div className="WatchPreferencesSection__threshold-marks flex justify-between text-xs text-gray-500 mt-2">
              <span>{MIN_AUTO_MARK_THRESHOLD}%</span>
              <span>{DEFAULT_AUTO_MARK_THRESHOLD}%</span>
              <span>{MAX_AUTO_MARK_THRESHOLD}%</span>
            </div>
          </label>
        </div>
      )}

      <div className="WatchPreferencesSection__actions flex items-center gap-3">
        {hasChanges && (
          <>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isUpdating}
              className="WatchPreferencesSection__save-button flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="WatchPreferencesSection__save-icon w-4 h-4" />
              {t('watchPreferences.saveChanges')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isUpdating}
              className="WatchPreferencesSection__cancel-button flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="WatchPreferencesSection__cancel-icon w-4 h-4" />
              {t('watchPreferences.cancel')}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleResetToDefaults}
          disabled={isUpdating}
          className="WatchPreferencesSection__reset-button flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="WatchPreferencesSection__reset-icon w-4 h-4" />
          {t('watchPreferences.resetToDefaults')}
        </button>
      </div>
    </div>
  );
}
