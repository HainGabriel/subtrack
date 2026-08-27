"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { loginAction } from "@/lib/actions/login-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Correo o contraseña incorrectos.",
};

function safeCallbackUrl(callbackUrl: string | undefined): string {
  if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }
  return "/panel";
}

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(
    initialError
      ? (ERROR_MESSAGES[initialError] ?? "Hubo un problema al iniciar sesión. Intenta de nuevo.")
      : null
  );

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const result = await loginAction(values);
    if (!result.success) {
      setServerError(result.error ?? "No pudimos iniciar sesión.");
      form.setFocus("email");
      return;
    }
    router.push(safeCallbackUrl(callbackUrl));
    router.refresh();
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

      <Field data-invalid={!!form.formState.errors.password}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Link
            href="/recuperar-contrasena"
            className="text-primary text-xs underline underline-offset-4"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
          aria-invalid={!!form.formState.errors.password}
        />
        <FieldError errors={[form.formState.errors.password]} />
      </Field>

      <Button type="submit" className="mt-2" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Spinner />}
        Iniciar sesión
      </Button>
    </form>
  );
}
