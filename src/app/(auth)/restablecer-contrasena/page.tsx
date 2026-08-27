import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Enlace inválido</h1>
          <p className="text-muted-foreground text-sm">
            Este enlace de restablecimiento de contraseña es inválido o venció.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>
            Falta el código de verificación en el enlace. Solicita uno nuevo.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/recuperar-contrasena">Solicitar un nuevo enlace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Restablece tu contraseña</h1>
        <p className="text-muted-foreground text-sm">Crea una contraseña nueva para tu cuenta.</p>
      </div>

      <ResetPasswordForm token={token} />
    </div>
  );
}
