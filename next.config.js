/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // Allow 127.0.0.1 for development (fixes cross-origin warning)
  allowedDevOrigins: ['127.0.0.1:3001', 'localhost:3001', '127.0.0.1:3000', 'localhost:3000', '10.0.0.20:3001'],
}

module.exports = nextConfig

