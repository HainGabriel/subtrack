"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Receipt, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { NAV_ITEMS } from "./nav-items";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground h-9 w-full max-w-64 justify-between gap-2 px-3 sm:flex"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          Buscar o ir a…
        </span>
        <Kbd>Ctrl K</Kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Búsqueda rápida"
        description="Navega o crea algo nuevo"
      >
        <CommandInput placeholder="Escribe un comando o búsqueda…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Acciones rápidas">
            <CommandItem onSelect={() => go("/suscripciones/nueva")}>
              <PlusCircle className="size-4" />
              Nueva suscripción
            </CommandItem>
            <CommandItem onSelect={() => go("/pagos")}>
              <Receipt className="size-4" />
              Registrar pago
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Ir a">
            {NAV_ITEMS.map((item) => (
              <CommandItem key={item.href} onSelect={() => go(item.href)}>
                <item.icon className="size-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
