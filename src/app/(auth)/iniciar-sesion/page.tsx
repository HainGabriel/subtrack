import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
        <p className="text-muted-foreground text-sm">
          Accede a tu panel de SubTrack para ver tus próximos cobros.
        </p>
      </div>

      <LoginForm callbackUrl={params.callbackUrl} initialError={params.error} />

      <p className="text-muted-foreground text-center text-sm">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-primary underline underline-offset-4">
          Crea una gratis
        </Link>
      </p>
    </div>
  );
}
