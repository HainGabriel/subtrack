import Link from "next/link";
import { Wallet, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Link href="/" className="mb-10 flex items-center gap-2">
        <Wallet className="text-primary size-5" aria-hidden="true" />
        <span className="text-lg font-semibold tracking-tight">SubTrack</span>
      </Link>
      <p className="text-primary font-mono text-sm font-medium tracking-widest">ERROR 404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Esta página no existe
      </h1>
      <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed sm:text-base">
        Puede que el enlace esté roto o que la página se haya movido. Vuelve al inicio para seguir
        donde lo dejaste.
      </p>
      <Button asChild className="mt-8 h-10 px-5">
        <Link href="/">
          <ArrowLeft />
          Volver al inicio
        </Link>
      </Button>
    </div>
  );
}
