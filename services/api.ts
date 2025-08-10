import { Video, VideoResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T> {
    data: T;
    error?: string;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
        const error = await response.text();
        return {
            data: [] as unknown as T,
            error: error || 'An error occurred while fetching the data.'
        };
    }

    const data = await response.json();
    console.log("API Response Data:", data); // Log the response data for debugging
    return { data };
}

export async function fetchVideos(): Promise<ApiResponse<VideoResponse>> {
    const response = await fetch(`${API_BASE_URL}/videos/`);
    return handleResponse<VideoResponse>(response);
}

export interface WatchStatusResponse {
    success: boolean;
}

export async function updateVideoWatchStatus(videoId: string, watched: boolean): Promise<ApiResponse<WatchStatusResponse>> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/watch/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ watched }),
    });
    return handleResponse<WatchStatusResponse>(response);
}
