"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { resetPasswordAction } from "@/lib/actions/password-reset-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const result = await resetPasswordAction(values);
    if (!result.success) {
      setServerError(result.error ?? "No pudimos restablecer tu contraseña.");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col gap-5">
        <Alert>
          <CheckCircle2 />
          <AlertDescription>
            Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.
          </AlertDescription>
        </Alert>
        <Button className="w-full" onClick={() => router.push("/iniciar-sesion")}>
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

  if (serverError && serverError.includes("inválido o venció")) {
    return (
      <div className="flex flex-col gap-5">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/recuperar-contrasena">Solicitar un nuevo enlace</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!form.formState.errors.password}>
        <FieldLabel htmlFor="password">Contraseña nueva</FieldLabel>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          {...form.register("password")}
          aria-invalid={!!form.formState.errors.password}
        />
        <FieldDescription>
          Al menos 10 caracteres, con mayúscula, minúscula y número.
        </FieldDescription>
        <FieldError errors={[form.formState.errors.password]} />
      </Field>

      <Field data-invalid={!!form.formState.errors.confirmPassword}>
        <FieldLabel htmlFor="confirmPassword">Confirma tu contraseña nueva</FieldLabel>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
          aria-invalid={!!form.formState.errors.confirmPassword}
        />
        <FieldError errors={[form.formState.errors.confirmPassword]} />
      </Field>

      <Button type="submit" className="mt-2" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Spinner />}
        Restablecer contraseña
      </Button>
    </form>
  );
}
