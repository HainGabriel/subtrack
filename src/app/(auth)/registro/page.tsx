import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
        <p className="text-muted-foreground text-sm">
          Es gratis y toma menos de un minuto. No necesitas tarjeta.
        </p>
      </div>

      <RegisterForm />

      <p className="text-muted-foreground text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/iniciar-sesion" className="text-primary underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
