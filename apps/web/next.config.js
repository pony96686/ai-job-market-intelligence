const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ai-job-market-intelligence/db', '@ai-job-market-intelligence/shared', '@ai-job-market-intelligence/ai'],
  // pdf-parse (and its pdfjs-dist dependency) ship a "browser" conditional
  // export that webpack picks over the Node build when bundled through a
  // transpiled workspace package (@ai-job-market-intelligence/ai), crashing
  // with "Object.defineProperty called on non-object" at runtime.
  // serverExternalPackages alone doesn't stop this because transpilePackages
  // forces webpack to keep walking into packages/ai's dependency graph, so
  // this pushes the exclusion directly onto webpack's server externals.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('pdf-parse', 'pdfjs-dist');
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
