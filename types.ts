// Generic Pagination Response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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

export interface AuthResponse {
  user: User;
  token: string;
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
  channel_tags: ChannelTag[];
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
}

// Tag Types
export enum TagMode {
  ALL = 'all',
  ANY = 'any'
}

export type TagModeType = TagMode.ALL | TagMode.ANY;

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

// For preview/display - only name & color required, everything else optional
export type ChannelTagPreview = Pick<ChannelTagBase, 'name' | 'color'> &
  Partial<Omit<ChannelTagBase, 'name' | 'color'>>;

// For partial updates
export type TagUpdateRequest = Partial<TagCreateRequest>;

export interface TagFilterParams {
  tags?: string[];
  tag_mode?: TagModeType;
  watch_status?: string;
}

export interface TagAssignmentRequest {
  tag_ids: string[];
}

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
  SERVICE_UNAVAILABLE = 503
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

export interface QuotaExceededError {
  error: string;
  quota_info: UserQuotaInfo;
  message: string;
}
