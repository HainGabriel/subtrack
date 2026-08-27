import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, Coins, PiggyBank, Wallet } from "lucide-react";
import { auth } from "@/lib/auth";

const VALUE_PROPS = [
  { icon: BellRing, text: "Recordatorios antes de cada cobro, no después." },
  { icon: PiggyBank, text: "Presupuestos por categoría que sí puedes seguir." },
  { icon: Coins, text: "Todas tus monedas, comparadas en un solo lugar." },
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) {
    redirect("/panel");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="bg-primary text-primary-foreground hidden flex-col justify-between p-10 md:flex lg:p-14">
        <Link href="/" className="flex items-center gap-2">
          <Wallet className="size-5" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight">SubTrack</span>
        </Link>

        <div className="flex flex-col gap-6">
          <h2 className="max-w-sm text-3xl leading-tight font-semibold tracking-tight text-balance lg:text-4xl">
            Administra tus suscripciones sin cobros sorpresa.
          </h2>
          <ul className="flex flex-col gap-4">
            {VALUE_PROPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="bg-primary-foreground/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-primary-foreground/90 text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-primary-foreground/60 text-xs">© {new Date().getFullYear()} SubTrack</p>
      </aside>

      <main className="flex flex-col items-center justify-center px-6 py-10 sm:px-10">
        <Link href="/" className="mb-8 flex items-center gap-2 md:hidden">
          <Wallet className="text-primary size-5" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight">SubTrack</span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
