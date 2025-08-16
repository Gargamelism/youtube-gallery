export interface Video {
    uuid: string;
    video_id: string;
    channel_title: string;
    title: string;
    description: string | null;
    video_url: string;
    thumbnail_url: string;
    watched: boolean;
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