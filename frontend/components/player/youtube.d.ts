/// <reference types="youtube" />

declare global {
  namespace YT {
    type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;

    interface OnStateChangeEvent {
      data: PlayerState;
      target: Player;
    }

    interface OnErrorEvent {
      data: number;
      target: Player;
    }

    interface Player {
      getDuration(): number;
      playVideo(): void;
      pauseVideo(): void;
      destroy(): void;
      getCurrentTime(): number;
      getDuration(): number;
      seekTo(int, bool): void;
      getPlayerState(): PlayerState;
      setVolume(volume: number): void;
      getVolume(): number;
      isMuted(): boolean;
      mute(): void;
      unMute(): void;
    }

    interface PlayerEvent {
      target: Player;
    }
  }

  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
