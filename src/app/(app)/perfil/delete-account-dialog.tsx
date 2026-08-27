"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { deleteAccountAction } from "@/lib/actions/profile-actions";

export function DeleteAccountDialog({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [pending, startTransition] = useTransition();

  const canConfirm =
    password.length > 0 && emailConfirmation.trim().toLowerCase() === email.toLowerCase();

  function reset() {
    setPassword("");
    setEmailConfirmation("");
  }

  function handleConfirm() {
    if (!canConfirm) return;
    startTransition(async () => {
      const result = await deleteAccountAction({ password, emailConfirmation });
      // Si la acción tiene éxito, redirige internamente y esta línea no se ejecuta.
      if (result && !result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="size-4" />
          Eliminar cuenta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar tu cuenta permanentemente</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán todas tus suscripciones, pagos, categorías, métodos de pago y
            presupuestos. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="delete-password">Contraseña actual</FieldLabel>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="delete-email">
              Escribe tu correo (<span className="font-mono">{email}</span>) para confirmar
            </FieldLabel>
            <Input
              id="delete-email"
              type="email"
              autoComplete="off"
              value={emailConfirmation}
              onChange={(e) => setEmailConfirmation(e.target.value)}
            />
            <FieldDescription>
              Esta confirmación reforzada evita eliminaciones accidentales.
            </FieldDescription>
          </Field>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!canConfirm || pending}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            Eliminar mi cuenta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
