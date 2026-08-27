import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Recupera tu contraseña</h1>
        <p className="text-muted-foreground text-sm">
          Ingresa el correo de tu cuenta y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-muted-foreground text-center text-sm">
        ¿Recordaste tu contraseña?{" "}
        <Link href="/iniciar-sesion" className="text-primary underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
