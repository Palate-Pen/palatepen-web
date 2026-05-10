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
          source: '/:path((?!app|api|_next|favicon).+)',
          has: [{ type: 'host', value: 'app.palateandpen.co.uk' }],
          destination: '/app/:path',
        },
      ],
    };
  },
};
module.exports = nextConfig;
