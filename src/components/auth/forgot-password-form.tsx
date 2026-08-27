"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { requestPasswordResetSchema, type RequestPasswordResetInput } from "@/lib/validation/auth";
import { requestPasswordResetAction } from "@/lib/actions/password-reset-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RequestPasswordResetInput) {
    setServerError(null);
    const result = await requestPasswordResetAction(values);
    if (!result.success) {
      setServerError(result.error ?? "No pudimos procesar la solicitud.");
      return;
    }
    setSuccessMessage(result.message ?? "Revisa tu correo para continuar.");
  }

  if (successMessage) {
    return (
      <div className="flex flex-col gap-5">
        <Alert>
          <CheckCircle2 />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/iniciar-sesion">
            <ArrowLeft />
            Volver a iniciar sesión
          </Link>
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

      <Field data-invalid={!!form.formState.errors.email}>
        <FieldLabel htmlFor="email">Correo</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
        />
        <FieldError errors={[form.formState.errors.email]} />
      </Field>

      <Button type="submit" className="mt-2" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Spinner />}
        Enviar enlace de recuperación
      </Button>
    </form>
  );
}
