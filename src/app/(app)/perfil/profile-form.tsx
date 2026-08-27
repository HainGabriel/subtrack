"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import { updateProfileAction } from "@/lib/actions/profile-actions";

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U"
  );
}

export function ProfileForm({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, image: image ?? "" },
  });

  const watchedImage = form.watch("image");
  const watchedName = form.watch("name");

  function onSubmit(values: ProfileInput) {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Perfil actualizado");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información personal</CardTitle>
        <CardDescription>Este nombre y avatar se mostrarán en toda la aplicación.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {watchedImage && <AvatarImage src={watchedImage} alt={watchedName || name} />}
              <AvatarFallback>{initials(watchedName || name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{email}</p>
              <p className="text-muted-foreground text-sm">El correo no se puede cambiar aquí.</p>
            </div>
          </div>

          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="profile-name">Nombre</FieldLabel>
            <Input
              id="profile-name"
              {...form.register("name")}
              aria-invalid={!!form.formState.errors.name}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.image}>
            <FieldLabel htmlFor="profile-image">URL del avatar (opcional)</FieldLabel>
            <Input
              id="profile-image"
              type="url"
              placeholder="https://…"
              {...form.register("image")}
              aria-invalid={!!form.formState.errors.image}
            />
            <FieldDescription>Pega el enlace de una imagen pública.</FieldDescription>
            <FieldError errors={[form.formState.errors.image]} />
          </Field>

          <div>
            <Button type="submit" disabled={pending}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
