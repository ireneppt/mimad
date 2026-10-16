import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El servidor de pruebas (npm run dev) usa su propia carpeta: así hacer
  // "npm run build" mientras está arrancado no lo rompe.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
