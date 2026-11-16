import type { NextConfig } from "next";

// Static export: `next build` writes plain HTML/JS/CSS to out/, which FastAPI serves.
// Data is loaded in the browser from /api, so the pages update without a rebuild.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
