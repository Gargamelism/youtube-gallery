import { UserQuotaInfo } from '@/types';

interface QuotaColorConfig {
  background: string;
  stroke: string;
  text: string;
  progress: string;
}

const QUOTA_COLOR_MAP: Record<UserQuotaInfo['status'], QuotaColorConfig> = {
  critical: {
    background: 'bg-red-50 border-red-200',
    stroke: 'stroke-red-600',
    text: 'text-red-600',
    progress: 'bg-red-500',
  },
  high: {
    background: 'bg-orange-50 border-orange-200',
    stroke: 'stroke-orange-600',
    text: 'text-orange-600',
    progress: 'bg-orange-500',
  },
  moderate: {
    background: 'bg-yellow-50 border-yellow-200',
    stroke: 'stroke-yellow-600',
    text: 'text-yellow-600',
    progress: 'bg-yellow-500',
  },
  normal: {
    background: 'bg-green-50 border-green-200',
    stroke: 'stroke-green-600',
    text: 'text-green-600',
    progress: 'bg-green-500',
  },
} as const;

export const getQuotaStatusClasses = (status: UserQuotaInfo['status']) => {
  return QUOTA_COLOR_MAP[status]?.background ?? QUOTA_COLOR_MAP.normal.background;
};

export const getQuotaStrokeClasses = (status: UserQuotaInfo['status']) => {
  return QUOTA_COLOR_MAP[status]?.stroke ?? QUOTA_COLOR_MAP.normal.stroke;
};

export const getQuotaTextClasses = (status: UserQuotaInfo['status']) => {
  return QUOTA_COLOR_MAP[status]?.text ?? QUOTA_COLOR_MAP.normal.text;
};

export const getQuotaProgressClasses = (status: UserQuotaInfo['status']) => {
  return QUOTA_COLOR_MAP[status]?.progress ?? QUOTA_COLOR_MAP.normal.progress;
};