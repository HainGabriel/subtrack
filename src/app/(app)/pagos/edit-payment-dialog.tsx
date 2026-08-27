"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePaymentAction } from "@/lib/actions/payment-actions";
import type { PaymentMethodOption } from "./record-payment-dialog";

export interface EditablePayment {
  id: string;
  subscriptionName: string;
  amount: string;
  currency: string;
  note: string | null;
  status: "SCHEDULED" | "PAID" | "SKIPPED" | "FAILED" | "REFUNDED" | "CANCELLED";
  paymentMethodId: string | null;
  dueDate: string; // ya formateada, solo para mostrar (nunca editable)
}

const STATUS_OPTIONS: Array<{ value: EditablePayment["status"]; label: string }> = [
  { value: "SCHEDULED", label: "Programado" },
  { value: "PAID", label: "Pagado" },
  { value: "SKIPPED", label: "Omitido" },
  { value: "FAILED", label: "Fallido" },
  { value: "REFUNDED", label: "Reembolsado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const NONE = "__none__";

interface EditPaymentDialogProps {
  payment: EditablePayment;
  paymentMethods: PaymentMethodOption[];
}

export function EditPaymentDialog({ payment, paymentMethods }: EditPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [amount, setAmount] = React.useState(payment.amount);
  const [currency, setCurrency] = React.useState(payment.currency);
  const [note, setNote] = React.useState(payment.note ?? "");
  const [status, setStatus] = React.useState<EditablePayment["status"]>(payment.status);
  const [paymentMethodId, setPaymentMethodId] = React.useState(payment.paymentMethodId ?? NONE);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await updatePaymentAction({
        paymentId: payment.id,
        amount: amount.trim() || undefined,
        currency: currency.trim() || undefined,
        note: note.trim() ? note.trim() : null,
        status,
        paymentMethodId: paymentMethodId === NONE ? null : paymentMethodId,
      });

      if (result.success) {
        toast.success("Pago actualizado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "No se pudo actualizar el pago.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Corregir pago de ${payment.subscriptionName}`}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Corregir pago</DialogTitle>
          <DialogDescription>
            {payment.subscriptionName} · vencimiento {payment.dueDate}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field orientation="responsive">
              <FieldLabel htmlFor="edit-amount">Importe</FieldLabel>
              <Input
                id="edit-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
            <Field orientation="responsive">
              <FieldLabel htmlFor="edit-currency">Moneda</FieldLabel>
              <Input
                id="edit-currency"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-status">Estado</FieldLabel>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as EditablePayment["status"])}
              >
                <SelectTrigger id="edit-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-method">Método de pago</FieldLabel>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger id="edit-method" className="w-full">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin especificar</SelectItem>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.alias}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-note">Nota</FieldLabel>
              <Textarea
                id="edit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
              <FieldDescription>
                La fecha de vencimiento del ciclo no se puede modificar.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
