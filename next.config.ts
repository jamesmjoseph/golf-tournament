import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Embedded at build time so the Lambda has it without needing runtime injection.
    // Only referenced in lib/supabase/server.ts (API routes) — never reaches client bundles.
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
};

export default nextConfig;
