"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, PauseCircle, PlayCircle, XCircle, Archive, CalendarX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  pauseAction,
  reactivateAction,
  scheduleCancellationAction,
  cancelNowAction,
  archiveAction,
} from "@/lib/actions/subscription-actions";
import type { SubscriptionStatus } from "@/generated/prisma/enums";

export function SubscriptionActionsBar({ id, status }: { id: string; status: SubscriptionStatus }) {
  const [pending, startTransition] = useTransition();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [cancelByDate, setCancelByDate] = useState<Date | undefined>(undefined);

  function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "ACTIVE" || status === "TRIAL") && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => pauseAction(id), "Suscripción pausada")}
        >
          <PauseCircle className="size-4" />
          Pausar
        </Button>
      )}

      {status === "PAUSED" && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => reactivateAction(id), "Suscripción reanudada")}
        >
          <PlayCircle className="size-4" />
          Reanudar
        </Button>
      )}

      {(status === "CANCELLED" || status === "EXPIRED" || status === "ARCHIVED") && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => reactivateAction(id), "Suscripción reactivada")}
        >
          <PlayCircle className="size-4" />
          Reactivar
        </Button>
      )}

      {(status === "ACTIVE" || status === "TRIAL" || status === "PAUSED") && (
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <Button variant="outline" disabled={pending} onClick={() => setScheduleOpen(true)}>
            <CalendarX className="size-4" />
            Programar cancelación
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Programar cancelación</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              La suscripción seguirá activa hasta la fecha límite que elijas (opcional). Puedes
              cancelarla de inmediato en su lugar desde el botón &ldquo;Cancelar ahora&rdquo;.
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="size-4" />
                  {cancelByDate ? format(cancelByDate, "PPP", { locale: es }) : "Sin fecha límite"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={cancelByDate}
                  onSelect={setCancelByDate}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await scheduleCancellationAction(id, { cancelByDate });
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Cancelación programada");
                    setScheduleOpen(false);
                  });
                }}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {status !== "CANCELLED" && status !== "ARCHIVED" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={pending}>
              <XCircle className="size-4" />
              Cancelar ahora
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar esta suscripción ahora?</AlertDialogTitle>
              <AlertDialogDescription>
                Se marcará como cancelada de inmediato. Podrás reactivarla más adelante sin perder
                su historial.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => run(() => cancelNowAction(id), "Suscripción cancelada")}
              >
                Cancelar suscripción
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {status !== "ARCHIVED" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" disabled={pending}>
              <Archive className="size-4" />
              Archivar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Archivar esta suscripción?</AlertDialogTitle>
              <AlertDialogDescription>
                Dejará de contar en tus totales activos, pero conserva todo su historial y puedes
                reactivarla cuando quieras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => run(() => archiveAction(id), "Suscripción archivada")}
              >
                Archivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
