import type { NextAuthConfig } from "next-auth";

/**
 * Configuración base SIN proveedores: la comparten `src/lib/auth/index.ts`
 * (la app completa) y `src/proxy.ts` (el Proxy/Middleware de Next.js).
 *
 * Por qué está separada: `proxy.ts` corre en un runtime restringido que no
 * soporta addons nativos de C++. El proveedor Credentials de
 * `src/lib/auth/index.ts` importa `argon2` (hash de contraseñas, un
 * binario nativo) — si el proxy importara esa configuración completa,
 * arrastraría `argon2` a su bundle y el build fallaría en Netlify con
 * "Usage of unsupported C++ Addon(s) found in Node.js Middleware". El
 * proxy solo necesita decodificar el JWT de sesión para saber si hay
 * sesión (`req.auth`), no verificar contraseñas — así que no necesita
 * ningún proveedor en absoluto.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/iniciar-sesion",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
};
