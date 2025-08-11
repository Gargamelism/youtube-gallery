export interface Video {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
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