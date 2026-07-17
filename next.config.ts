import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare quick tunnels (see README "Testing on your phone") use a random
  // *.trycloudflare.com subdomain each run, so allow the whole wildcard rather
  // than one hostname.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
