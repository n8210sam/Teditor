/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for GitHub Pages
  output: 'export',
  
  // Base path for GitHub Pages (uncomment and update with your repo name)
  // basePath: process.env.NODE_ENV === 'production' ? '/Teditor' : '',
  
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
