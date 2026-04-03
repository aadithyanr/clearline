import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.23.44.246', 'clearline-one.vercel.app'],
  // Prevent Turbopack from trying to bundle Node.js-only packages
  serverExternalPackages: ['mongodb', 'whatsapp-web.js', 'puppeteer', 'puppeteer-core'],
};

export default nextConfig;
