'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Video } from '@/types';
import { X, Check } from 'lucide-react';
import { useUpdateWatchProgress, useMarkAsWatched } from './mutations';
import { getVideoWatchProgress } from '@/services/videos';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
  onWatchStatusChange: (isWatched: boolean) => void;
}

export function VideoPlayer({ video, onClose, onWatchStatusChange }: VideoPlayerProps) {
  const { t } = useTranslation('player');
  const queryClient = useQueryClient();
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isWatched, setIsWatched] = useState(video.is_watched);
  const [autoMarkThreshold, setAutoMarkThreshold] = useState(75);
  const [startPosition, setStartPosition] = useState(video.watch_progress_seconds || 0);

  const { mutateAsync: updateProgress } = useUpdateWatchProgress(queryClient, video.uuid);
  const { mutateAsync: markAsWatched, isPending: isMarkingWatched } = useMarkAsWatched(queryClient, video.uuid);

  const getYouTubeVideoId = useCallback(() => {
    return video.video_id;
  }, [video.video_id]);

  // Fetch latest watch progress on mount to ensure we have the most recent position
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await getVideoWatchProgress(video.uuid);
        if (response.data) {
          setStartPosition(response.data.watch_progress_seconds || 0);
        }
      } catch (error) {
        console.error('Failed to fetch watch progress:', error);
      }
    };
    fetchProgress();
  }, [video.uuid]);

  // Initialize YouTube IFrame API and create player instance
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: getYouTubeVideoId(),
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          start: startPosition,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event: YT.PlayerEvent) => {
            setIsReady(true);
            setDuration(event.target.getDuration());
          },
          onStateChange: handlePlayerStateChange,
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      playerRef.current?.destroy();
    };
  }, [video.video_id, startPosition, getYouTubeVideoId]);

  // Track playback progress and send updates to backend every 10 seconds (only when playing)
  useEffect(() => {
    if (!isReady || !playerRef.current || !isPlaying) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

      const current = player.getCurrentTime();
      const total = player.getDuration();

      setCurrentTime(current);

      if (Math.floor(current) % 10 === 0) {
        updateProgress({
          current_time: current,
          duration: total,
          auto_mark: true,
        }).then(response => {
          if (response.data?.auto_marked && !isWatched) {
            setIsWatched(true);
            onWatchStatusChange(true);
          }
          if (response.data?.threshold) {
            setAutoMarkThreshold(response.data.threshold);
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, isPlaying, updateProgress, isWatched, onWatchStatusChange]);

  const handlePlayerStateChange = (event: YT.OnStateChangeEvent) => {
    const state = event.data;

    if (state === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
    } else if (state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.BUFFERING) {
      setIsPlaying(false);
    } else if (state === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
      if (!isWatched) {
        handleMarkAsWatched();
      }
    }
  };

  const handleMarkAsWatched = async () => {
    const response = await markAsWatched(true);
    if (response.data?.is_watched) {
      setIsWatched(true);
      onWatchStatusChange(true);
    }
  };

  const watchPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="VideoPlayer fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="VideoPlayer__modal relative w-full max-w-6xl bg-black rounded-lg overflow-hidden">
        <div className="VideoPlayer__header absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-start justify-between">
          <div className="VideoPlayer__info flex-1 pr-4">
            <h2 className="VideoPlayer__title text-white text-lg font-semibold line-clamp-2">{video.title}</h2>
            <p className="VideoPlayer__channel text-gray-300 text-sm mt-1">{video.channel_title}</p>
          </div>

          <button
            onClick={onClose}
            className="VideoPlayer__close text-white hover:text-gray-300 transition-colors flex-shrink-0"
            aria-label={t('closePlayer')}
          >
            <X className="VideoPlayer__close-icon w-6 h-6" />
          </button>
        </div>

        <div className="VideoPlayer__container relative pt-[56.25%]">
          <div ref={containerRef} className="VideoPlayer__iframe absolute inset-0" id={`player-${video.uuid}`} />
        </div>

        <div className="VideoPlayer__controls bg-gray-900 p-4">
          <div className="VideoPlayer__progress mb-4">
            <div className="VideoPlayer__progress-track w-full bg-gray-700 h-1 rounded-full overflow-hidden">
              <div
                className="VideoPlayer__progress-bar bg-red-600 h-full transition-all duration-300"
                style={{ width: `${watchPercentage}%` }}
              />
            </div>
            <div className="VideoPlayer__progress-info flex justify-between text-xs text-gray-400 mt-1">
              <span className="VideoPlayer__progress-text">{Math.floor(watchPercentage)}% watched</span>
              {watchPercentage >= autoMarkThreshold && !isWatched && (
                <span className="VideoPlayer__progress-hint text-yellow-400">{t('almostDone')}</span>
              )}
            </div>
          </div>

          <div className="VideoPlayer__actions flex items-center gap-3">
            {!isWatched ? (
              <button
                onClick={handleMarkAsWatched}
                disabled={isMarkingWatched}
                className="VideoPlayer__watch-button flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Check className="VideoPlayer__watch-icon w-4 h-4" />
                {isMarkingWatched ? t('marking') : t('markAsWatched')}
              </button>
            ) : (
              <div className="VideoPlayer__watched-badge flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg">
                <Check className="VideoPlayer__watched-icon w-4 h-4" />
                {t('watched')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
