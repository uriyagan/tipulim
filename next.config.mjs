/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma must stay external so OpenNext can patch it for the Workers runtime
  // (otherwise the client loads the Rust engine and calls fs.readdir at runtime).
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;

// Enable Cloudflare bindings during `next dev` (no-op outside dev).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();