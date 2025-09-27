'use client';

import { useTranslation } from 'react-i18next';
import { UserQuotaInfo } from '@/types';
import { getQuotaStatusClasses, getQuotaStrokeClasses, getQuotaTextClasses } from './quotaColors';

interface QuotaIndicatorCompactProps {
  quotaInfo: UserQuotaInfo;
  className?: string;
}

export function QuotaIndicatorCompact({ quotaInfo, className = '' }: QuotaIndicatorCompactProps) {
  const { t } = useTranslation('quota');
  const size = 32;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const percent = Math.max(0, Math.min(100, quotaInfo.percentage_used));
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={`
        QuotaIndicatorCompact flex items-center justify-center px-2 py-1 rounded-lg border h-10
        ${getQuotaStatusClasses(quotaInfo.status)}
        ${className}
      `}
      title={t('dailyYouTubeQuota')}
      aria-label={t('quotaPercentageAria', { percent: quotaInfo.percentage_used.toFixed(0) })}
    >
      <div className="QuotaIndicatorCompact__circle relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-gray-300"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`${getQuotaStrokeClasses(quotaInfo.status)} transition-all duration-500 ease-in-out`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        <div className="QuotaIndicatorCompact__center absolute inset-0 flex items-center justify-center">
          <div
            className={`QuotaIndicatorCompact__percentage text-[9px] font-medium leading-none ${getQuotaTextClasses(
              quotaInfo.status
            )}`}
            style={{
              maxWidth: `${radius * 1.8}px`,
              minWidth: 'fit-content',
            }}
          >
            {quotaInfo.percentage_used.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
