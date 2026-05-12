/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: 'app.palateandpen.co.uk' }],
          destination: '/app',
        },
        {
          source: '/:path((?!app|api|invite|m|_next|favicon|icon|apple-icon|robots|sitemap).+)',
          has: [{ type: 'host', value: 'app.palateandpen.co.uk' }],
          destination: '/app/:path',
        },
      ],
    };
  },
  async redirects() {
    return [
      { source: '/mise', destination: '/palatable', permanent: true },
      { source: '/mise/app', destination: '/app', permanent: true },
      { source: '/api/mise/:path*', destination: '/api/palatable/:path*', permanent: true },
    ];
  },
};
module.exports = nextConfig;
