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
  api: {
    baseUrl: typeof window === 'undefined'
      ? getEnvVar('BE_INTERNAL_API_URL', 'http://backend:8000/api')
      : getEnvVar('BE_PUBLIC_API_URL', 'http://localhost:8000/api'),
  },
  app: {
    isProduction: process.env.NODE_ENV === 'production',
  },
} as const;