import type { NextConfig } from "next";

// Política de seguridad de contenido pragmática: 'unsafe-inline' en
// script/style sigue siendo necesario porque Next.js inyecta el JSON de
// hidratación (`__NEXT_DATA__`) y algunas librerías de UI (Radix/cmdk)
// aplican estilos inline para posicionamiento — endurecerla con nonces
// por request es la mejora documentada en docs/SECURITY.md.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // "standalone" produce un server.js autocontenido pensado para
  // Docker/Node propio (ver Dockerfile). El adaptador de Netlify (y
  // Vercel) hace su propio empaquetado por función a partir de la salida
  // por defecto de `next build` — forzar "standalone" ahí puede romper
  // esa división. Docker activa esto con BUILD_STANDALONE=true; Netlify
  // no define esa variable, así que obtiene la salida por defecto.
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" as const } : {}),
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
