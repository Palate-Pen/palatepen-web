/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'app.palateandpen.co.uk' }],
          destination: '/app/:path*',
        },
        {
          source: '/',
          has: [{ type: 'host', value: 'app.palateandpen.co.uk' }],
          destination: '/app',
        },
      ],
    };
  },
};
module.exports = nextConfig;
