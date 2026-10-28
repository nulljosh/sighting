import type { NextConfig } from "next";

// ponytail: every page is "use client" against Supabase, so there is nothing to
// render on a server — a static export drops straight onto Pages, no adapter.
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
