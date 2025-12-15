function getEnvVar(name: string, defaultValue?: string): string {
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  auth: {
    cookieName: getEnvVar('AUTH_COOKIE_NAME', 'youtube-gallery-auth'),
  },
  app: {
    isProduction: process.env.NODE_ENV === 'production',
  },
} as const;

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:8000/api`;
  }
  return getEnvVar('BE_INTERNAL_API_URL', 'http://backend:8000/api');
}

export function getApiUrl(path: string = ''): string {
  return `${getApiBaseUrl()}${path}`;
}

export function getYouTubeCallbackUrl(): string {
  return getApiUrl('/auth/youtube/callback');
}

export function parseBackendUrl(): { protocol: string; hostname: string; port: string } {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return {
      protocol: window.location.protocol.replace(':', ''),
      hostname: host,
      port: '8000',
    };
  }

  const backendUrl = getEnvVar('BE_INTERNAL_API_URL', 'http://backend:8000/api');
  try {
    const urlObj = new URL(backendUrl);
    return {
      protocol: urlObj.protocol.replace(':', ''),
      hostname: urlObj.hostname,
      port: urlObj.port || '8000',
    };
  } catch {
    return { protocol: 'http', hostname: 'backend', port: '8000' };
  }
}
