"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { recordAdHocPaymentAction } from "@/lib/actions/payment-actions";

export interface SubscriptionOption {
  id: string;
  name: string;
  amount: string;
  currency: string;
  paymentMethodId: string | null;
  nextBillingDate: string; // ISO yyyy-MM-dd
}

export interface PaymentMethodOption {
  id: string;
  alias: string;
}

interface RecordPaymentDialogProps {
  subscriptions: SubscriptionOption[];
  paymentMethods: PaymentMethodOption[];
}

const NONE = "__none__";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentDialog({ subscriptions, paymentMethods }: RecordPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [subscriptionId, setSubscriptionId] = React.useState<string>("");

  const [dueDate, setDueDate] = React.useState("");
  const [paidDate, setPaidDate] = React.useState(todayIso());
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [paymentMethodId, setPaymentMethodId] = React.useState<string>(NONE);
  const [note, setNote] = React.useState("");

  const selected = subscriptions.find((s) => s.id === subscriptionId);

  function resetAndClose() {
    setOpen(false);
    setStep(1);
    setSubscriptionId("");
    setDueDate("");
    setPaidDate(todayIso());
    setAmount("");
    setCurrency("");
    setPaymentMethodId(NONE);
    setNote("");
  }

  function chooseSubscription(id: string) {
    const sub = subscriptions.find((s) => s.id === id);
    setSubscriptionId(id);
    setDueDate(sub?.nextBillingDate ?? todayIso());
    setPaymentMethodId(sub?.paymentMethodId ?? NONE);
    setStep(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subscriptionId || !dueDate || !paidDate) return;

    startTransition(async () => {
      const result = await recordAdHocPaymentAction({
        subscriptionId,
        dueDate,
        paidDate,
        amount: amount.trim() || undefined,
        currency: currency.trim() || undefined,
        paymentMethodId: paymentMethodId === NONE ? null : paymentMethodId,
        note: note.trim() || undefined,
      });

      if (result.success) {
        toast.success("Pago registrado.");
        resetAndClose();
        router.refresh();
      } else {
        toast.error(result.error ?? "No se pudo registrar el pago.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetAndClose();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" /> Registrar pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Elige la suscripción para este pago."
              : `Pago para ${selected?.name ?? ""}`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="subscription-select">Suscripción</FieldLabel>
              <Select value={subscriptionId} onValueChange={chooseSubscription}>
                <SelectTrigger id="subscription-select" className="w-full">
                  <SelectValue placeholder="Busca una suscripción" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subscriptions.length === 0 && (
                <FieldDescription>No tienes suscripciones para registrar pagos.</FieldDescription>
              )}
            </Field>
          </FieldGroup>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field orientation="responsive">
                <FieldLabel htmlFor="dueDate">Fecha de vencimiento</FieldLabel>
                <Input
                  id="dueDate"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
              <Field orientation="responsive">
                <FieldLabel htmlFor="paidDate">Fecha de pago</FieldLabel>
                <Input
                  id="paidDate"
                  type="date"
                  required
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
              </Field>
              <Field orientation="responsive">
                <FieldLabel htmlFor="amount">Importe</FieldLabel>
                <Input
                  id="amount"
                  inputMode="decimal"
                  placeholder={selected ? `${selected.amount} (por defecto)` : "0.00"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field orientation="responsive">
                <FieldLabel htmlFor="currency">Moneda</FieldLabel>
                <Input
                  id="currency"
                  maxLength={3}
                  placeholder={selected?.currency ?? "USD"}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="paymentMethod">Método de pago</FieldLabel>
                <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                  <SelectTrigger id="paymentMethod" className="w-full">
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
                <FieldLabel htmlFor="note">Nota</FieldLabel>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={pending}>
                Atrás
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Registrando…" : "Registrar pago"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
