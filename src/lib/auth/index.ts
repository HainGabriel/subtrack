import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { authConfig } from "@/lib/auth/config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const limited = rateLimit(
          `login:${email}`,
          RATE_LIMITS.login.limit,
          RATE_LIMITS.login.windowMs
        );
        if (!limited.success) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
});
