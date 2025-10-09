import { ChannelFilters, ChannelApiParams, TagMode, TagModeType, ChannelType } from '@/types';

/**
 * Convert user-facing filters to URL parameters with appropriate prefix
 *
 * @param filters - Component filter state with semantic names
 * @param type - Channel type ('subscribed' or 'available')
 * @returns URL parameters with shortened names (ss/as, sts/ats, stm/atm, sp/ap)
 */
export function filtersToUrlParams(
  filters: Partial<ChannelFilters>,
  type: ChannelType
): Record<string, string | undefined> {
  const prefix = type === ChannelType.SUBSCRIBED ? 's' : 'a';

  return {
    [`${prefix}s`]: filters.search || undefined,
    [`${prefix}ts`]: filters.selectedTags?.length ? filters.selectedTags.join(',') : undefined,
    [`${prefix}tm`]:
      filters.selectedTags?.length && filters.selectedTags.length > 1 ? filters.tagMode : undefined,
    [`${prefix}p`]: filters.page && filters.page > 1 ? filters.page.toString() : undefined,
  };
}

/**
 * Parse URL parameters to user-facing filters
 *
 * @param searchParams - URLSearchParams from Next.js
 * @param type - Channel type ('subscribed' or 'available')
 * @returns Component filter state with semantic names
 */
export function urlParamsToFilters(searchParams: URLSearchParams, type: ChannelType): ChannelFilters {
  const prefix = type === ChannelType.SUBSCRIBED ? 's' : 'a';

  return {
    search: searchParams.get(`${prefix}s`) || '',
    selectedTags: searchParams.get(`${prefix}ts`)?.split(',').filter(Boolean) || [],
    tagMode: (searchParams.get(`${prefix}tm`) as TagModeType) || TagMode.ANY,
    page: parseInt(searchParams.get(`${prefix}p`) || '1', 10),
  };
}

/**
 * Convert user-facing filters to backend API parameters
 *
 * @param filters - Component filter state with semantic names
 * @returns API parameters with full backend-compatible names
 */
export function filtersToApiParams(filters: Partial<ChannelFilters>): ChannelApiParams {
  const params: ChannelApiParams = {};

  if (filters.search) {
    params.search = filters.search;
  }

  if (filters.selectedTags?.length) {
    params.tags = filters.selectedTags;
  }

  if (filters.selectedTags?.length && filters.selectedTags.length > 1 && filters.tagMode) {
    params.tag_mode = filters.tagMode;
  }

  if (filters.page) {
    params.page = filters.page;
  }

  return params;
}
