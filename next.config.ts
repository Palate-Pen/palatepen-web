import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Bundle CLAUDE.md with the deployment so /admin/ops can parse the
  // Roadmap section at request time. Without this, Vercel's file
  // tracer skips root-level markdown and fs.readFileSync fails in
  // production.
  outputFileTracingIncludes: {
    '/admin/ops': ['./CLAUDE.md'],
  },
};

export default config;
