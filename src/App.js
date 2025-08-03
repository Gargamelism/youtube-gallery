import React, { useState } from 'react';
import Header from './components/Header';
import VideoList from './components/VideoList';

const App = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleVideosUpdate = (newVideos) => {
    setVideos(newVideos);
  };

  const handleLoadingUpdate = (isLoading) => {
    setLoading(isLoading);
  };

  const handleWatchVideo = (videoId) => {
    setVideos(prevVideos => prevVideos.filter(video => video.id !== videoId));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header
          onVideosUpdate={handleVideosUpdate}
          onLoadingUpdate={handleLoadingUpdate}
        />

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {videos.length > 0 && (
          <div className="mb-6">
            <p className="text-gray-600">
              {videos.length} video{videos.length !== 1 ? 's' : ''} loaded
            </p>
          </div>
        )}

        <VideoList
          videos={videos}
          onWatchVideo={handleWatchVideo}
        />

        {videos.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Enter the path to your Excel file and click "Load File"
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Default: ./videos.xlsx
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;