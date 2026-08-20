/** @type {import('next').NextConfig} */
const nextConfig = {
  // Matches the existing Cloudflare Pages project's build settings (root
  // directory "app", static HTML export) so it deploys without needing any
  // dashboard changes.
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
