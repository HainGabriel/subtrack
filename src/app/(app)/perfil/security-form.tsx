"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/auth";
import { changePasswordAction } from "@/lib/actions/profile-actions";

export function SecurityForm() {
  const [pending, startTransition] = useTransition();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: ChangePasswordInput) {
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Contraseña actualizada");
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>Usa una contraseña que no utilices en otros sitios.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-sm flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.currentPassword}>
            <FieldLabel htmlFor="current-password">Contraseña actual</FieldLabel>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
              aria-invalid={!!form.formState.errors.currentPassword}
            />
            <FieldError errors={[form.formState.errors.currentPassword]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.newPassword}>
            <FieldLabel htmlFor="new-password">Nueva contraseña</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
              aria-invalid={!!form.formState.errors.newPassword}
            />
            <FieldDescription>
              Mínimo 10 caracteres, con mayúscula, minúscula y número.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.newPassword]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.confirmPassword}>
            <FieldLabel htmlFor="confirm-password">Confirmar nueva contraseña</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
              aria-invalid={!!form.formState.errors.confirmPassword}
            />
            <FieldError errors={[form.formState.errors.confirmPassword]} />
          </Field>

          <div>
            <Button type="submit" disabled={pending}>
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
