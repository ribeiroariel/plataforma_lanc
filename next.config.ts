import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de bolsistas e imagens de notícias ficam no Storage do Supabase.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
