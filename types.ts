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
  subscribed_at: string;
  created_at: string;
}

export interface UserChannelResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserChannel[];
}

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

export interface VideoResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Video[];
}

export interface VideoStats {
  total: number;
  watched: number;
  unwatched: number;
}
