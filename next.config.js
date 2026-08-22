/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/eventos', destination: '/eventos.html' }
    ];
  }
};

module.exports = nextConfig;
