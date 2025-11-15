'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Video } from '@/types';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import { useUpdateWatchProgress, useMarkAsWatched } from './mutations';
import { getVideoWatchProgress } from '@/services/videos';
import { useKeyboardNavigation } from '@/components/keyboard/useKeyboardNavigation';
import { createPlayerKeyboardShortcuts } from './keyboardShortcuts';

interface VideoPlayerProps {
  video: Video;
  startTime?: number;
  onClose: () => void;
  onWatchStatusChange: (isWatched: boolean) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export function VideoPlayer({
  video,
  startTime: initialStartTime,
  onClose,
  onWatchStatusChange,
  onTimeUpdate,
}: VideoPlayerProps) {
  const { t } = useTranslation('player');
  const queryClient = useQueryClient();
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastProgressUpdateRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isWatched, setIsWatched] = useState(video.is_watched);
  const [autoMarkThreshold, setAutoMarkThreshold] = useState(75);
  const [startPosition, setStartPosition] = useState(initialStartTime ?? video.watch_progress_seconds ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(initialStartTime === undefined);

  const { mutateAsync: updateProgress } = useUpdateWatchProgress(queryClient, video.uuid);
  const { mutateAsync: markAsWatched, isPending: isMarkingWatched } = useMarkAsWatched(queryClient, video.uuid);

  const getYouTubeVideoId = useCallback(() => {
    return video.video_id;
  }, [video.video_id]);

  // Fetch latest watch progress on mount if not provided via startTime
  useEffect(() => {
    if (initialStartTime !== undefined) {
      setIsLoadingProgress(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        setIsLoadingProgress(true);
        const response = await getVideoWatchProgress(video.uuid);
        if (response.data) {
          setStartPosition(response.data.watch_progress_seconds || 0);
          setAutoMarkThreshold(response.data.threshold || 75);
        }
      } catch (fetchError) {
        console.error('Failed to fetch watch progress:', fetchError);
      } finally {
        setIsLoadingProgress(false);
      }
    };
    fetchProgress();
  }, [video.uuid, initialStartTime]);

  // Keyboard shortcuts configuration
  const keyboardShortcuts = useMemo(
    () => createPlayerKeyboardShortcuts(playerRef, containerRef, onClose),
    [onClose]
  );

  useKeyboardNavigation({
    enabled: isReady && !error,
    shortcuts: keyboardShortcuts,
  });

  // Initialize YouTube IFrame API and create player instance
  useEffect(() => {
    if (isLoadingProgress) {
      return;
    }

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      try {
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
              setError(null);
            },
            onStateChange: handlePlayerStateChange,
            onError: (event: YT.OnErrorEvent) => {
              console.error('YouTube player error:', event.data);
              setError(t('errorLoadingVideo'));
            },
          },
        });
      } catch (playerError) {
        console.error('Failed to initialize player:', playerError);
        setError(t('errorLoadingVideo'));
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      playerRef.current?.destroy();
    };
  }, [video.video_id, startPosition, getYouTubeVideoId, isLoadingProgress, t]);

  // Track playback progress and send updates to backend every 10 seconds with debouncing
  useEffect(() => {
    if (!isReady || !playerRef.current || !isPlaying) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

      const current = player.getCurrentTime();
      const total = player.getDuration();

      setCurrentTime(current);

      const currentFloor = Math.floor(current);
      const shouldUpdate = currentFloor % 10 === 0 && currentFloor !== lastProgressUpdateRef.current;

      if (shouldUpdate) {
        lastProgressUpdateRef.current = currentFloor;

        updateProgress({
          current_time: current,
          duration: total,
          auto_mark: true,
        })
          .then(response => {
            if (response.data?.auto_marked && !isWatched) {
              setIsWatched(true);
              onWatchStatusChange(true);
            }
            if (response.data?.threshold) {
              setAutoMarkThreshold(response.data.threshold);
            }
          })
          .catch(progressError => {
            console.error('Failed to update progress:', progressError);
          });

        if (onTimeUpdate) {
          onTimeUpdate(current);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, isPlaying, updateProgress, isWatched, onWatchStatusChange, onTimeUpdate]);

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
    try {
      const response = await markAsWatched(true);
      if (response.data?.is_watched) {
        setIsWatched(true);
        onWatchStatusChange(true);
      }
    } catch (markError) {
      console.error('Failed to mark as watched:', markError);
    }
  };

  const watchPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const thresholdPercentage = autoMarkThreshold;
  const hasProgress = startPosition > 0 && !video.is_watched;

  return (
    <div
      className="VideoPlayer fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-player-title"
    >
      <div className="VideoPlayer__modal relative w-full max-w-6xl bg-black rounded-lg overflow-hidden">
        {/* Header */}
        <div className="VideoPlayer__header absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-start justify-between">
          <div className="VideoPlayer__info flex-1 pr-4">
            <h2 id="video-player-title" className="VideoPlayer__title text-white text-lg font-semibold line-clamp-2">
              {video.title}
            </h2>
            <p className="VideoPlayer__channel text-gray-300 text-sm mt-1">{video.channel_title}</p>
          </div>

          <button
            onClick={onClose}
            className="VideoPlayer__close text-white hover:text-gray-300 transition-colors flex-shrink-0"
            aria-label={t('closePlayer')}
            tabIndex={0}
          >
            <X className="VideoPlayer__close-icon w-6 h-6" />
          </button>
        </div>

        {/* Player Container */}
        <div className="VideoPlayer__container relative pt-[56.25%]">
          {isLoadingProgress && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-white">{t('loadingPlayer')}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center max-w-md px-4">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-white text-lg mb-2">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {t('closePlayer')}
                </button>
              </div>
            </div>
          )}

          <div ref={containerRef} className="VideoPlayer__iframe absolute inset-0" id={`player-${video.uuid}`} />

          {hasProgress && !isReady && !error && !isLoadingProgress && (
            <div className="absolute bottom-4 left-4 right-4 bg-blue-600/90 text-white px-4 py-3 rounded-lg shadow-lg">
              <p className="text-sm font-medium">
                {t('resume', {
                  time: new Date(startPosition * 1000).toISOString().substr(11, 8),
                })}
              </p>
            </div>
          )}
        </div>

        {/* Controls Overlay */}
        {!error && !isLoadingProgress && (
          <div className="VideoPlayer__controls bg-gray-900 p-4">
            <div className="VideoPlayer__progress mb-4">
              <div className="VideoPlayer__progress-track relative w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className="VideoPlayer__progress-bar absolute top-0 left-0 h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${watchPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={Math.floor(watchPercentage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('watchProgress', { percentage: Math.floor(watchPercentage) })}
                />
                <div
                  className="VideoPlayer__threshold-indicator absolute top-0 h-full w-1 bg-yellow-400"
                  style={{ left: `${thresholdPercentage}%` }}
                  aria-hidden="true"
                  title={t('autoMarkThreshold', { threshold: thresholdPercentage })}
                />
              </div>
              <div className="VideoPlayer__progress-info flex justify-between text-xs text-gray-400 mt-1">
                <span className="VideoPlayer__progress-text">{Math.floor(watchPercentage)}% {t('watched')}</span>
                {watchPercentage >= thresholdPercentage && !isWatched && (
                  <span className="VideoPlayer__progress-hint text-yellow-400">{t('almostDone')}</span>
                )}
              </div>
            </div>

            <div className="VideoPlayer__actions flex items-center gap-3 flex-wrap">
              {!isWatched ? (
                <button
                  onClick={handleMarkAsWatched}
                  disabled={isMarkingWatched}
                  className="VideoPlayer__watch-button flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  aria-label={t('markAsWatched')}
                >
                  <Check className="VideoPlayer__watch-icon w-4 h-4" />
                  {isMarkingWatched ? t('marking') : t('markAsWatched')}
                </button>
              ) : (
                <div
                  className="VideoPlayer__watched-badge flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg"
                  role="status"
                  aria-label={t('watched')}
                >
                  <Check className="VideoPlayer__watched-icon w-4 h-4" />
                  {t('watched')}
                </div>
              )}

              <div className="VideoPlayer__keyboard-hint text-xs text-gray-500 ml-auto hidden md:block">
                <kbd className="px-2 py-1 bg-gray-800 rounded">Space</kbd> {t('playPause')} ·{' '}
                <kbd className="px-2 py-1 bg-gray-800 rounded">←→</kbd> {t('seek')} ·{' '}
                <kbd className="px-2 py-1 bg-gray-800 rounded">F</kbd> {t('fullscreen')} ·{' '}
                <kbd className="px-2 py-1 bg-gray-800 rounded">Esc</kbd> {t('close')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
