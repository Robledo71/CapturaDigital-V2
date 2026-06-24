import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un build autónomo (.next/standalone) para una imagen Docker mínima.
  output: "standalone",
};

module.exports = {
  allowedDevOrigins: ['192.168.10.186'],
}

export default nextConfig;
