import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pg'],
  // Enable file watching with polling for Docker on Windows
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config) => {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300,
      };
      return config;
    },
  }),
};

export default nextConfig;
