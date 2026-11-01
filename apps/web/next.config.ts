import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /** The web app never knows DATABASE_URL; it only proxies to the API origin. */
  env: { API_ORIGIN: process.env.API_ORIGIN ?? "http://127.0.0.1:4000" },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default config;
