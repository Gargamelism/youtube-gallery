import React from 'react';
import { Play, Calendar, Tag, Trash2 } from 'lucide-react';

const VideoCard = ({ video, onWatch, onMarkWatched }) => {
    // Hebrew text detection
    const isHebrew = (text) => {
        if (!text) return false;
        const hebrewRegex = /[\u0590-\u05FF]/;
        return hebrewRegex.test(text);
    };

    // Language-aware text direction
    const getTextDirection = (text) => {
        return isHebrew(text) ? 'rtl' : 'ltr';
    };

    // Language-aware alignment
    const getTextAlign = (text) => {
        return isHebrew(text) ? 'text-right' : 'text-left';
    };

    const formatDuration = (duration) => {
        if (!duration) return '';
        // Handle various duration formats
        if (typeof duration === 'string') {
            return duration;
        }
        if (typeof duration === 'number') {
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return duration.toString();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200">
            <div className="flex p-6">
                {/* Thumbnail - Left Side */}
                <div className="relative w-64 h-36 bg-gray-900 flex-shrink-0">
                    {video.thumbnailPath ? (
                        <img
                            src={video.thumbnailPath}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div
                        className="absolute inset-0 bg-gray-700 flex items-center justify-center"
                        style={{ display: video.thumbnailPath ? 'none' : 'flex' }}
                    >
                        <Play className="h-16 w-16 text-white opacity-60" />
                    </div>

                    {/* Duration Badge */}
                    {video.duration && (
                        <div className="absolute bottom-3 right-3 bg-black bg-opacity-80 text-white px-3 py-1 rounded text-sm font-medium">
                            {formatDuration(video.duration)}
                        </div>
                    )}
                </div>

                {/* Video Info - Right Side */}
                <div className="flex-1 pl-6 flex flex-col">
                    {/* Title */}
                    <h3
                        className={`text-2xl font-bold text-gray-900 mb-3 leading-tight ${getTextAlign(video.title)}`}
                        dir={getTextDirection(video.title)}
                    >
                        {video.title}
                    </h3>

                    {/* Description */}
                    {video.description && (
                        <p
                            className={`text-gray-600 mb-4 leading-relaxed text-base flex-1 ${getTextAlign(video.description)}`}
                            dir={getTextDirection(video.description)}
                        >
                            {video.description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div className="space-y-3">
                        {video.publishedAt && (
                            <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="h-4 w-4 mr-3 flex-shrink-0" />
                                <span className="font-medium">{formatDate(video.publishedAt)}</span>
                            </div>
                        )}

                        {video.tags && (
                            <div className="flex items-start text-sm text-gray-500">
                                <Tag className="h-4 w-4 mr-3 flex-shrink-0 mt-0.5" />
                                <span
                                    className={`font-medium ${getTextAlign(video.tags)}`}
                                    dir={getTextDirection(video.tags)}
                                >
                                    {video.tags}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Separator */}
            <div className="h-px bg-gray-200"></div>

            {/* Actions - Bottom Section */}
            <div className="px-6 py-6">
                <div className="flex justify-start items-center space-x-4">
                    <button
                        onClick={onWatch}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
                    >
                        <Play className="h-5 w-5" />
                        <span>Play Video</span>
                    </button>

                    <button
                        onClick={onMarkWatched}
                        className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 font-medium"
                        title="Mark as watched (removes from list)"
                    >
                        <Trash2 className="h-5 w-5" />
                        <span>Mark Watched</span>
                    </button>
                </div>
            </div>
        </div >
    );
};

export default VideoCard;