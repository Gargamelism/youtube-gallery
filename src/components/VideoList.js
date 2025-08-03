import React from 'react';
import VideoCard from './VideoCard';

const VideoList = ({ videos, onWatchVideo }) => {
    const handleVideoClick = (videoUrl) => {
        if (videoUrl) {
            window.open(videoUrl, '_blank');
        }
    };

    return (
        <div className="py-6">
            {videos.map((video) => (
                <VideoCard
                    key={video.id}
                    video={video}
                    onWatch={() => handleVideoClick(video.videoUrl)}
                    onMarkWatched={() => onWatchVideo(video.id)}
                />
            ))}
        </div>
    );
};

export default VideoList;