"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { registerAction } from "@/lib/actions/register-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const result = await registerAction(values);
    // Si el registro tiene éxito, la acción redirige a /onboarding en el
    // servidor y esta función nunca resuelve un valor con success: true.
    if (result && !result.success) {
      setServerError(result.error ?? "No pudimos crear tu cuenta.");
      form.setFocus("name");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!form.formState.errors.name}>
        <FieldLabel htmlFor="name">Nombre</FieldLabel>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          autoFocus
          {...form.register("name")}
          aria-invalid={!!form.formState.errors.name}
        />
        <FieldError errors={[form.formState.errors.name]} />
      </Field>

      <Field data-invalid={!!form.formState.errors.email}>
        <FieldLabel htmlFor="email">Correo</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
        />
        <FieldError errors={[form.formState.errors.email]} />
      </Field>

      <Field data-invalid={!!form.formState.errors.password}>
        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
          aria-invalid={!!form.formState.errors.password}
        />
        <FieldDescription>
          Al menos 10 caracteres, con mayúscula, minúscula y número.
        </FieldDescription>
        <FieldError errors={[form.formState.errors.password]} />
      </Field>

      <Field data-invalid={!!form.formState.errors.confirmPassword}>
        <FieldLabel htmlFor="confirmPassword">Confirma tu contraseña</FieldLabel>
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
        Crear cuenta
      </Button>
    </form>
  );
}
