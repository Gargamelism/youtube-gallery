/// <reference types="youtube" />

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
