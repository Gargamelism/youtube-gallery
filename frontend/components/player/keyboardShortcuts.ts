import { KeyboardShortcut } from '@/components/keyboard/useKeyboardNavigation';

export function createPlayerKeyboardShortcuts(
  playerRef: React.RefObject<YT.Player | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  onClose: () => void
): KeyboardShortcut[] {
  return [
    {
      key: 'Escape',
      action: onClose,
      description: 'Close player',
    },
    {
      key: ' ',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      },
      description: 'Play/Pause',
    },
    {
      key: 'k',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      },
      description: 'Play/Pause',
    },
    {
      key: 'ArrowLeft',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        player.seekTo(Math.max(0, player.getCurrentTime() - 5), true);
      },
      description: 'Rewind 5 seconds',
    },
    {
      key: 'ArrowRight',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        player.seekTo(Math.min(player.getDuration(), player.getCurrentTime() + 5), true);
      },
      description: 'Forward 5 seconds',
    },
    {
      key: 'ArrowUp',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        player.setVolume(Math.min(100, player.getVolume() + 10));
      },
      description: 'Volume up',
    },
    {
      key: 'ArrowDown',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        player.setVolume(Math.max(0, player.getVolume() - 10));
      },
      description: 'Volume down',
    },
    {
      key: 'm',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        if (player.isMuted()) {
          player.unMute();
        } else {
          player.mute();
        }
      },
      description: 'Mute/Unmute',
    },
    {
      key: 'f',
      action: () => {
        const iframe = containerRef.current?.querySelector('iframe');
        if (iframe && document.fullscreenEnabled) {
          if (!document.fullscreenElement) {
            iframe.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        }
      },
      description: 'Toggle fullscreen',
    },
    {
      key: '0',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        player.seekTo(0, true);
      },
      description: 'Restart video',
    },
    {
      key: 'Home',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        player.seekTo(0, true);
      },
      description: 'Jump to beginning',
    },
    {
      key: 'End',
      action: () => {
        const player = playerRef.current;
        if (!player) return;
        player.seekTo(player.getDuration(), true);
      },
      description: 'Jump to end',
    },
  ];
}
