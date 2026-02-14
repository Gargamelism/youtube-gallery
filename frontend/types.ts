// Generic Pagination Response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Pagination Parameters
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// User Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  captcha_token?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  captcha_token?: string;
}

// Channel Types
export interface Channel {
  uuid: string;
  channel_id: string;
  title: string;
  description: string | null;
  url: string | null;
  total_videos: number;
  watched_videos: number;
  unwatched_videos: number;
  is_subscribed: boolean;
  created_at: string;
}

export interface UserChannel {
  id: string;
  channel: string;
  channel_title: string;
  channel_id: string;
  is_active: boolean;
  tags: ChannelTag[];
  subscribed_at: string;
  created_at: string;
}

export type ChannelResponse = PaginatedResponse<Channel>;
export type UserChannelResponse = PaginatedResponse<UserChannel>;

// Video Types
export interface Video {
  uuid: string;
  video_id: string;
  channel_title: string;
  title: string;
  description: string | null;
  published_at: string;
  duration: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  thumbnail_url: string;
  video_url: string;
  is_watched: boolean;
  watched_at: string | null;
  notes: string | null;
  is_not_interested: boolean;
  not_interested_at: string | null;
  channel_tags: ChannelTag[];
  watch_progress_seconds?: number;
  watch_percentage?: number;
  auto_marked_watched?: boolean;
}

export interface UserVideo {
  id: string;
  video: string;
  video_title: string;
  video_id: string;
  is_watched: boolean;
  watched_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type VideoResponse = PaginatedResponse<Video>;

export interface VideoStats {
  total: number;
  watched: number;
  unwatched: number;
  not_interested: number;
}

export enum WatchStatus {
  WATCHED = 'watched',
  UNWATCHED = 'unwatched',
  ALL = 'all',
}

export enum NotInterestedFilter {
  ONLY = 'only',
  EXCLUDE = 'exclude',
  INCLUDE = 'include',
}

// Tag Types
export enum TagMode {
  ALL = 'all',
  ANY = 'any',
  EXCEPT = 'except',
}

export type TagModeType = TagMode.ALL | TagMode.ANY | TagMode.EXCEPT;

export interface VideoFilters {
  filter: string;
  selectedTags: string[];
  tagMode: TagModeType;
  searchQuery: string;
  notInterestedFilter: NotInterestedFilter;
}

// Channel Filter Types
export enum ChannelType {
  SUBSCRIBED = 'subscribed',
  AVAILABLE = 'available',
}

export interface ChannelFilters {
  search: string;
  selectedTags: string[];
  tagMode: TagModeType;
  page: number;
  pageSize?: number;
}

export interface ChannelApiParams {
  search?: string;
  tags?: string[];
  tag_mode?: TagModeType;
  page?: number;
}

// Single source of truth - with description always optional
interface ChannelTagBase {
  id: string;
  name: string;
  color: string;
  description?: string;
  channel_count: number;
  created_at: string;
}

export type ChannelTagResponse = PaginatedResponse<ChannelTagBase>;

// API response type - has all fields, description optional
export type ChannelTag = ChannelTagBase;

// For creating new tags - no server-generated fields
export type TagCreateRequest = Omit<ChannelTagBase, 'id' | 'channel_count' | 'created_at'>;

// For partial updates
export type TagUpdateRequest = Partial<TagCreateRequest>;

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// User Quota Types
export interface UserQuotaInfo {
  daily_limit: number;
  used: number;
  remaining: number;
  percentage_used: number;
  status: 'normal' | 'moderate' | 'high' | 'critical';
  operations_breakdown: Record<string, number>;
  resets_at: string;
}

export interface QuotaExceededErrorType {
  error: string;
  quota_info: UserQuotaInfo;
  message: string;
}

// Watch Preferences Types
export interface WatchPreferences {
  auto_mark_watched_enabled: boolean;
  auto_mark_threshold: number;
}

export interface WatchPreferencesUpdateRequest {
  auto_mark_watched_enabled: boolean;
  auto_mark_threshold: number;
}

export interface WatchPreferencesResponse {
  status: string;
  auto_mark_watched_enabled: boolean;
  auto_mark_threshold: number;
  message?: string;
}

// Video Player Types
export interface VideoPlayerState {
  isOpen: boolean;
  video: Video | null;
  startTime?: number;
}

export interface WatchProgressUpdate {
  current_time: number;
  duration: number;
  auto_mark: boolean;
}

export interface WatchProgressResponse {
  status: string;
  watch_progress_seconds: number;
  watch_percentage: number;
  is_watched: boolean;
  auto_marked: boolean;
  threshold: number;
  message: string;
}
