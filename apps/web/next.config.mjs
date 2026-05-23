/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for optimal Docker/Railway deployment
  // Produces a self-contained bundle in .next/standalone (much smaller image)
  output: 'standalone',

  images: {
    remotePatterns: [
      // Cloudinary — all cloud image URLs
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Dev helpers
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
    ],
  },
};

export default nextConfig;
