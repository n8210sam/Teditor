import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for GitHub Pages
  output: isDev ? undefined : 'export',

  // Always use basePath to match production (GitHub Pages subpath)
  basePath: '/Teditor',

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},

  async redirects() {
    if (!isDev) return [];
    return [
      {
        source: '/',
        destination: '/Teditor',
        basePath: false,
        permanent: false,
      },
    ];
  },
}

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
});

export default withSerwist(nextConfig);
