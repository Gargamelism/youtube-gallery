import { UserQuotaInfo } from '@/types';

export const getQuotaStatusClasses = (status: UserQuotaInfo['status']) => {
  switch (status) {
    case 'critical':
      return 'bg-red-50 border-red-200';
    case 'high':
      return 'bg-orange-50 border-orange-200';
    case 'moderate':
      return 'bg-yellow-50 border-yellow-200';
    default:
      return 'bg-green-50 border-green-200';
  }
};

export const getQuotaStrokeClasses = (status: UserQuotaInfo['status']) => {
  switch (status) {
    case 'critical':
      return 'stroke-red-600';
    case 'high':
      return 'stroke-orange-600';
    case 'moderate':
      return 'stroke-yellow-600';
    default:
      return 'stroke-green-600';
  }
};

export const getQuotaTextClasses = (status: UserQuotaInfo['status']) => {
  switch (status) {
    case 'critical':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'moderate':
      return 'text-yellow-600';
    default:
      return 'text-green-600';
  }
};

export const getQuotaProgressClasses = (status: UserQuotaInfo['status']) => {
  switch (status) {
    case 'critical':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'moderate':
      return 'bg-yellow-500';
    default:
      return 'bg-green-500';
  }
};