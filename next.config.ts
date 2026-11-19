import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de bolsistas e imagens de notícias ficam no Storage do Supabase.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    serverActions: {
      // O padrão é 1 MB, e foto de celular passa disso: o envio da foto de
      // perfil e da imagem da notícia era barrado antes de chegar à action.
      // As imagens já são reduzidas no navegador (src/lib/reduzirImagem.ts);
      // este teto é a folga para o formulário (5 MB + campos).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
