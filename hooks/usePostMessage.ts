'use client';

import { useEffect, useCallback, useRef } from 'react';

// Allowed origins based on environment
const ALLOWED_ORIGINS = [
  ...(process.env.NODE_ENV === 'development'
    ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ]
    : ['https://nogarythmtube.com']
  ),
  window.location.origin
];

export enum PostMessageType {
  YOUTUBE_AUTH_SUCCESS = 'youtube-auth-success',
}

interface PostMessageOptions {
  targetOrigin?: string;
  validateOrigin?: boolean;
  allowedOrigins?: string[];
}

interface UsePostMessageReturn {
  sendMessage: (message: PostMessageType, targetWindow?: Window) => void;
}

export function usePostMessage(
  onMessage: (event: MessageEvent) => void,
  options: PostMessageOptions = {}
): UsePostMessageReturn {
  const {
    targetOrigin = window.location.origin,
    validateOrigin = true,
    allowedOrigins = ALLOWED_ORIGINS
  } = options;
  const onMessageRef = useRef(onMessage);

  // Keep the latest callback in ref to avoid stale closures
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const handleMessage = useCallback((event: MessageEvent) => {
    // Validate origin if enabled
    if (validateOrigin && !allowedOrigins.includes(event.origin)) {
      console.warn('PostMessage: Origin validation failed', {
        received: event.origin,
        allowed: allowedOrigins
      });
      return;
    }

    // Call the actual message handler
    onMessageRef.current(event);
  }, [validateOrigin, allowedOrigins]);

  const sendMessage = useCallback((message: PostMessageType, targetWindow: Window = window.parent) => {
    try {
      targetWindow.postMessage(message, targetOrigin);
    } catch (error) {
      console.error('PostMessage: Failed to send message', error);
    }
  }, [targetOrigin]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return { sendMessage };
}