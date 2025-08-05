/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000", 
        "127.0.0.1:3000",
        // Add your production domain here
        ...(process.env.NEXT_PUBLIC_BASE_URL ? [process.env.NEXT_PUBLIC_BASE_URL.replace(/^https?:\/\//, '')] : []),
        // Allow any vercel.app domain for Vercel deployments
        ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : []),
        // Allow any domain in production (remove this line and specify your exact domain for better security)
        "*"
      ]
    }
  },
  // Enable WebSocket support
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
  // Add headers for better camera/media support
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, display-capture=*'
          }
        ],
      },
    ];
  },
}

export default nextConfig