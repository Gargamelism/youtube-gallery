function parseBackendUrl() {
  const backendUrl = process.env.BE_PUBLIC_API_URL || 'http://localhost:8000/api';
  try {
    const url = new URL(backendUrl);
    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: url.port || '8000',
    };
  } catch {
    return {
      protocol: 'http',
      hostname: 'localhost',
      port: '8000',
    };
  }
}

const backendConfig = parseBackendUrl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: backendConfig.protocol,
        hostname: backendConfig.hostname,
        port: backendConfig.port,
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
