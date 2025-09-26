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
  const strokeDashoffset = circumference - (quotaInfo.percentage_used / 100) * circumference;

  return (
    <div
      className={`
        QuotaIndicatorCompact flex items-center justify-center px-2 py-1 rounded-lg border h-10
        ${getQuotaStatusClasses(quotaInfo.status)}
        ${className}
      `}
      title={t('dailyYouTubeQuota')}
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

        <div className="QuotaIndicatorCompact__center absolute inset-0 flex flex-col items-center justify-center text-center">
          <div
            className={`QuotaIndicatorCompact__percentage text-xs font-bold ${getQuotaTextClasses(quotaInfo.status)}`}
          >
            {quotaInfo.percentage_used.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
