'use client';

import { useTranslation } from 'react-i18next';
import { UserQuotaInfo } from '@/types';
import { formatTimeFromUTC } from '@/utils/dateUtils';
import { getQuotaStatusClasses, getQuotaTextClasses, getQuotaProgressClasses } from './quotaColors';

interface QuotaIndicatorProps {
  quotaInfo: UserQuotaInfo;
  className?: string;
}

export function QuotaIndicator({ quotaInfo, className = '' }: QuotaIndicatorProps) {
  const { t } = useTranslation('quota');

  return (
    <div
      className={`
        QuotaIndicator p-3 rounded-lg border
        ${getQuotaStatusClasses(quotaInfo.status)} ${getQuotaTextClasses(quotaInfo.status)}
        ${className}
      `}
    >
      <div className="QuotaIndicator__header flex items-center justify-between mb-2">
        <div className="QuotaIndicator__title text-sm font-medium">{t('dailyUsage')}</div>
        <div className="QuotaIndicator__stats text-xs font-mono">
          {quotaInfo.used}/{quotaInfo.daily_limit}
        </div>
      </div>

      <div className="QuotaIndicator__progress-container w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`
            QuotaIndicator__progress-bar h-2 rounded-full transition-all duration-300
            ${getQuotaProgressClasses(quotaInfo.status)}
          `}
          style={{ width: `${Math.max(0, Math.min(quotaInfo.percentage_used, 100))}%` }}
        />
      </div>

      <div className="QuotaIndicator__footer flex items-center justify-between text-xs">
        <span className="QuotaIndicator__remaining text-gray-600">
          {t('remaining', { count: quotaInfo.remaining })}
        </span>
        <div className="QuotaIndicator__reset-info text-right">
          <div className="QuotaIndicator__reset-time text-gray-500">
            {t('resetsAt', { time: quotaInfo.resets_at ? formatTimeFromUTC(quotaInfo.resets_at) : '—' })}
          </div>
          <div className="QuotaIndicator__reset-explainer text-gray-400 text-xs">{t('resetsExplainer')}</div>
        </div>
      </div>
    </div>
  );
}
