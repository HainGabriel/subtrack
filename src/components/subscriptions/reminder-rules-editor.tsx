"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Item, ItemContent, ItemActions, ItemTitle } from "@/components/ui/item";
import {
  addReminderRuleAction,
  removeReminderRuleAction,
  toggleReminderRuleAction,
} from "@/lib/actions/subscription-actions";

export interface ReminderRuleRow {
  id: string;
  offsetDays: number;
  enabled: boolean;
}

function describeOffset(offsetDays: number): string {
  if (offsetDays === 0) return "El mismo día del cobro";
  if (offsetDays > 0) return `${offsetDays} ${offsetDays === 1 ? "día" : "días"} antes`;
  return `${Math.abs(offsetDays)} ${Math.abs(offsetDays) === 1 ? "día" : "días"} después de vencida`;
}

export function ReminderRulesEditor({
  subscriptionId,
  rules,
}: {
  subscriptionId: string;
  rules: ReminderRuleRow[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newOffset, setNewOffset] = useState("");
  const [pending, startTransition] = useTransition();

  const sorted = [...rules].sort((a, b) => b.offsetDays - a.offsetDays);

  function handleToggle(rule: ReminderRuleRow) {
    setPendingId(rule.id);
    startTransition(async () => {
      const result = await toggleReminderRuleAction(subscriptionId, rule.id, !rule.enabled);
      setPendingId(null);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleRemove(rule: ReminderRuleRow) {
    setPendingId(rule.id);
    startTransition(async () => {
      const result = await removeReminderRuleAction(subscriptionId, rule.id);
      setPendingId(null);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleAdd() {
    const offsetDays = Number(newOffset);
    if (!Number.isInteger(offsetDays)) {
      toast.error("Ingresa un número entero de días.");
      return;
    }
    startTransition(async () => {
      const result = await addReminderRuleAction(subscriptionId, offsetDays);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNewOffset("");
      toast.success("Aviso agregado");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.length === 0 && (
        <p className="text-muted-foreground text-sm">No hay avisos configurados.</p>
      )}
      {sorted.map((rule) => (
        <Item key={rule.id} variant="outline" size="sm">
          <ItemContent>
            <ItemTitle>{describeOffset(rule.offsetDays)}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Switch
              checked={rule.enabled}
              onCheckedChange={() => handleToggle(rule)}
              disabled={pending && pendingId === rule.id}
              aria-label={`Avisos ${describeOffset(rule.offsetDays)} ${rule.enabled ? "activados" : "desactivados"}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={pending && pendingId === rule.id}
              onClick={() => handleRemove(rule)}
              aria-label={`Quitar aviso: ${describeOffset(rule.offsetDays)}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </ItemActions>
        </Item>
      ))}

      <div className="flex items-end gap-2 pt-1">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-reminder-offset" className="text-muted-foreground text-xs">
            Días de anticipación (0 = mismo día)
          </label>
          <Input
            id="new-reminder-offset"
            type="number"
            step={1}
            inputMode="numeric"
            value={newOffset}
            onChange={(event) => setNewOffset(event.target.value)}
            className="w-36"
            placeholder="Ej. 14"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={pending || !newOffset}
        >
          <Plus className="size-4" />
          Agregar aviso
        </Button>
      </div>
    </div>
  );
}
