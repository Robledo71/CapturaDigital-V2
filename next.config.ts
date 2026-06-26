import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un build autónomo (.next/standalone) para una imagen Docker mínima.
  output: "standalone",

  // Orígenes permitidos para assets en desarrollo (LAN).
  allowedDevOrigins: ["192.168.10.186"],

  experimental: {
    // Client Router Cache: reutiliza el render (RSC) de cada ruta en el navegador
    // durante esta ventana, evitando volver a llamar al server al cambiar de módulo.
    // Es por-navegador (no filtra datos entre usuarios) y router.refresh() lo invalida.
    staleTimes: {
      dynamic: 30,  // rutas dinámicas (las que usan cache:'no-store') → 30 s
      static: 180,  // rutas estáticas / con prefetch → 3 min
    },
  },
};

export default nextConfig;
