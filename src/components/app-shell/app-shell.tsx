"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { CommandPalette } from "./command-palette";

export function AppShell({
  name,
  email,
  image,
  unreadNotifications,
  children,
}: {
  name: string;
  email: string;
  image?: string | null;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-screen w-full">
      <aside className="border-sidebar-border bg-sidebar hidden w-64 shrink-0 border-r md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 px-4">
          <Wallet className="text-primary size-5" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight">SubTrack</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav unreadNotifications={unreadNotifications} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="h-16 flex-row items-center gap-2 space-y-0 px-4">
            <Wallet className="text-primary size-5" aria-hidden="true" />
            <SheetTitle className="text-lg">SubTrack</SheetTitle>
          </SheetHeader>
          <div className="py-2">
            <SidebarNav
              unreadNotifications={unreadNotifications}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-40 flex h-16 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir menú de navegación"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <Link href="/panel" className="text-lg font-semibold tracking-tight md:hidden">
            SubTrack
          </Link>
          <div className="flex flex-1 justify-center md:justify-start">
            <CommandPalette />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu name={name} email={email} image={image} />
          </div>
        </header>
        <main id="contenido-principal" className="flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
