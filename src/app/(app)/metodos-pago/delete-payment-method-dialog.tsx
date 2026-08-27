"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deletePaymentMethodAction } from "@/lib/actions/payment-method-actions";

export interface DeletablePaymentMethod {
  id: string;
  alias: string;
  subscriptionCount: number;
}

export function DeletePaymentMethodDialog({
  open,
  onOpenChange,
  method,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: DeletablePaymentMethod | null;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!method) return;
    startTransition(async () => {
      const result = await deletePaymentMethodAction(method.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Método de pago eliminado");
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar “{method?.alias}”</AlertDialogTitle>
          <AlertDialogDescription>
            {method && method.subscriptionCount > 0 ? (
              <>
                {method.subscriptionCount}{" "}
                {method.subscriptionCount === 1 ? "suscripción dejará" : "suscripciones dejarán"} de
                tener un método de pago asignado. Esta acción no se puede deshacer.
              </>
            ) : (
              "Esta acción no se puede deshacer."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={pending}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
