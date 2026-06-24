/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/genai/:path*',
        destination: 'https://generativelanguage.googleapis.com/:path*',
      },
    ];
  },
};

export default nextConfig;
