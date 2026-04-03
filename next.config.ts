import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.23.44.246', 'clearline-one.vercel.app'],
  serverExternalPackages: ['mongodb', 'whatsapp-web.js', 'puppeteer', 'puppeteer-core'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
