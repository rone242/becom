/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for optimal Docker/Railway deployment
  // Produces a self-contained bundle in .next/standalone (much smaller image)
  output: 'standalone',

  images: {
    remotePatterns: [
      // Legacy Cloudinary (kept for backward compat with existing data)
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Cloudflare R2 — matches any R2 public URL / custom domain
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      // Support custom R2 domain (e.g. assets.yourdomain.com)
      // Add your specific R2_PUBLIC_URL hostname here if using a custom domain
      { protocol: 'https', hostname: '*.yourdomain.com' },
      // Dev helpers
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
    ],
  },
};

export default nextConfig;
