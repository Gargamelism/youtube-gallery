import {
    VideoResponse,
    VideoStats,
    User,
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    Channel,
    UserChannel,
    UserVideo,
    UserChannelResponse
} from "@/types";
import { useAuthStore } from "@/stores/authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T> {
    data: T;
    error?: string;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
        if (response.status === 401) {
            const authStore = useAuthStore.getState();
            authStore.logout();

            // Trigger auth modal by dispatching a custom event
            window.dispatchEvent(new CustomEvent('auth-required'));

            return {
                data: [] as unknown as T,
                error: 'Authentication required'
            };
        }

        const errorText = await response.text();
        let errorMessage: string;

        try {
            const errorData = JSON.parse(errorText);
            errorMessage = typeof errorData === 'object'
                ? JSON.stringify(errorData)
                : errorData;
        } catch {
            errorMessage = errorText || 'An error occurred while fetching the data.';
        }

        return {
            data: [] as unknown as T,
            error: errorMessage
        };
    }

    const data = await response.json();
    return { data };
}

function getAuthHeaders(): Record<string, string> {
    return useAuthStore.getState().getAuthHeaders();
}

export async function login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    return handleResponse<AuthResponse>(response);
}

export async function register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    return handleResponse<AuthResponse>(response);
}

export async function logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse<{ message: string }>(response);
}

export async function fetchUserProfile(): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: getAuthHeaders()
    });
    return handleResponse<User>(response);
}

// Video API
export async function fetchVideos(filter?: string): Promise<ApiResponse<VideoResponse>> {
    let url = `${API_BASE_URL}/videos`;
    if (filter && filter !== 'all') {
        url = `${API_BASE_URL}/videos/${filter}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    return handleResponse<VideoResponse>(response);
}

export async function fetchVideoStats(): Promise<ApiResponse<VideoStats>> {
    const response = await fetch(`${API_BASE_URL}/videos/stats`, {
        headers: getAuthHeaders()
    });
    return handleResponse<VideoStats>(response);
}

export interface WatchStatusResponse {
    status: string;
    is_watched: boolean;
    watched_at: string | null;
    notes: string | null;
}

export async function updateVideoWatchStatus(
    videoId: string,
    is_watched: boolean,
    notes?: string
): Promise<ApiResponse<WatchStatusResponse>> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/watch`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_watched, notes: notes || '' })
    });
    return handleResponse<WatchStatusResponse>(response);
}

// Channel API
export async function fetchChannels(): Promise<ApiResponse<{ results: Channel[] }>> {
    const response = await fetch(`${API_BASE_URL}/channels`, {
        headers: getAuthHeaders()
    });
    return handleResponse<{ results: Channel[] }>(response);
}

export async function fetchChannelById(channelId: string): Promise<ApiResponse<Channel>> {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse<Channel>(response);
}

export async function importChannelFromYoutube(channelId: string): Promise<ApiResponse<Channel>> {
    const response = await fetch(`${API_BASE_URL}/channels/fetch-from-youtube`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ channel_id: channelId })
    });
    return handleResponse<Channel>(response);
}

// User Channel Subscriptions API
export async function fetchUserChannels(): Promise<ApiResponse<UserChannelResponse>> {
    const response = await fetch(`${API_BASE_URL}/auth/channels`, {
        headers: getAuthHeaders()
    });
    return handleResponse<UserChannelResponse>(response);
}

export async function subscribeToChannel(channelId: string): Promise<ApiResponse<UserChannel>> {
    const response = await fetch(`${API_BASE_URL}/auth/channels`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ channel: channelId })
    });
    return handleResponse<UserChannel>(response);
}

export async function unsubscribeFromChannel(subscriptionId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/auth/channels/${subscriptionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse<void>(response);
}

// User Video Interactions API
export async function fetchUserVideos(): Promise<ApiResponse<UserVideo[]>> {
    const response = await fetch(`${API_BASE_URL}/auth/videos`, {
        headers: getAuthHeaders()
    });
    return handleResponse<UserVideo[]>(response);
}
