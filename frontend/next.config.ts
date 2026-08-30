import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "apod.nasa.gov",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images-assets.nasa.gov",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.nasa.gov",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.spacetelescope.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
