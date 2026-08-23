/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zykhabeftqddreitrnbc.supabase.co',
        pathname: '/storage/v1/object/public/**'
      }
    ]
  },
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/eventos', destination: '/eventos.html' }
    ];
  }
};

module.exports = nextConfig;
