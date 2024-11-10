// youtube.d.ts
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

export {};
