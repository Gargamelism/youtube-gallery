"use client";

import { Play, Check } from "lucide-react";
import Image from "next/image";
import { Video } from "@/types";

interface VideoCardProps {
  video: Video;
  onWatch: () => void;
  onMarkWatched: () => void;
}

export function VideoCard({ video, onWatch, onMarkWatched }: VideoCardProps) {
  // Hebrew text detection
  const isHebrew = (text: string | null) => {
    if (!text) return false;
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  };

  // Language-aware text direction
  const getTextDirection = (text: string | null) => {
    return isHebrew(text) ? "rtl" : "ltr";
  };

  // Language-aware alignment
  const getTextAlign = (text: string | null) => {
    return isHebrew(text) ? "text-right" : "text-left";
  };

  return (
    <div className="video-card-container relative overflow-hidden rounded-lg border bg-background shadow p-4">
      <div className="video-card-content flex flex-col sm:flex-row items-start gap-4">
        <div className="video-thumbnail-container w-full sm:w-64 h-40 relative overflow-hidden rounded-md">
          <Image src={video.thumbnail_url} alt={video.title} fill className="object-cover" />
          <button
            onClick={onWatch}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
          >
            <Play className="w-12 h-12 text-white" />
          </button>
        </div>

        <div className="video-details-container flex-1 min-w-0">
          <h3
            className={`text-lg font-semibold mb-2 ${getTextAlign(video.title)}`}
            style={{ direction: getTextDirection(video.title) }}
          >
            {video.title}
          </h3>

          <div className="video-actions-container space-y-2">
            <button
              onClick={onMarkWatched}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                video.watched ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Check className="w-4 h-4" />
              {video.watched ? "Watched" : "Mark as watched"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
