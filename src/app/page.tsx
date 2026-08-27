import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, BellRing, PiggyBank, Coins, Wallet2, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const UPCOMING_CHARGES = [
  {
    name: "Netflix",
    category: "Entretenimiento",
    amount: "15.99",
    currency: "USD",
    dueLabel: "en 2 días",
    urgent: true,
    dot: "bg-chart-2/15 text-chart-2",
  },
  {
    name: "Notion",
    category: "Productividad",
    amount: "10.00",
    currency: "USD",
    dueLabel: "en 5 días",
    urgent: true,
    dot: "bg-chart-1/15 text-chart-1",
  },
  {
    name: "Spotify Family",
    category: "Entretenimiento",
    amount: "650.00",
    currency: "DOP",
    dueLabel: "en 9 días",
    urgent: false,
    dot: "bg-chart-5/15 text-chart-5",
  },
  {
    name: "iCloud+",
    category: "Almacenamiento",
    amount: "2.99",
    currency: "USD",
    dueLabel: "en 14 días",
    urgent: false,
    dot: "bg-chart-3/15 text-chart-3",
  },
];

const FEATURES = [
  {
    icon: Wallet2,
    title: "Control de gastos",
    description:
      "Ve cuánto gastas en total y por categoría, con el desglose de cada suscripción activa.",
  },
  {
    icon: BellRing,
    title: "Recordatorios",
    description:
      "Recibe avisos antes de cada cobro y de que termine una prueba gratis, no después.",
  },
  {
    icon: PiggyBank,
    title: "Presupuestos",
    description:
      "Define un límite mensual o anual por categoría y entérate cuando estés por superarlo.",
  },
  {
    icon: Coins,
    title: "Multi-moneda",
    description:
      "Registra cada suscripción en su moneda original y compáralas todas en un mismo lugar.",
  },
];

const VALUE_PROPS = [
  "Sin tarjeta para registrarte",
  "Tus datos, en tu base de datos",
  "Listo en menos de un minuto",
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/panel");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background/90 supports-[backdrop-filter]:bg-background/70 border-border sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Wallet className="text-primary size-5" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-tight">SubTrack</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/iniciar-sesion">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-both flex flex-col gap-6 duration-700 motion-reduce:animate-none">
              <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
                El estado de cuenta de tus suscripciones,{" "}
                <span className="text-primary">antes</span> de que llegue el cobro.
              </h1>
              <p className="text-muted-foreground max-w-lg text-base leading-relaxed sm:text-lg">
                SubTrack reúne streaming, software y membresías en un solo lugar para que sepas
                cuánto gastas, cuándo se renueva cada una y cómo evitarte cobros inesperados en la
                tarjeta.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-11 px-6 text-base">
                  <Link href="/registro">
                    Crear cuenta gratis
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 px-6 text-base">
                  <Link href="/iniciar-sesion">Ya tengo cuenta</Link>
                </Button>
              </div>
              <ul className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {VALUE_PROPS.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span
                      className="bg-primary size-1.5 shrink-0 rounded-full"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-both relative delay-150 duration-700 motion-reduce:animate-none">
              <div
                aria-hidden="true"
                className="bg-primary/10 absolute -inset-6 -z-10 rounded-[2rem] blur-3xl"
              />
              <Card className="mx-auto w-full max-w-sm shadow-sm lg:mx-0">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>Próximos cobros</CardTitle>
                    <CardDescription>Vista previa de tu panel</CardDescription>
                  </div>
                  <Badge variant="secondary">4 activas</Badge>
                </CardHeader>
                <CardContent className="flex flex-col">
                  {UPCOMING_CHARGES.map((item) => (
                    <div
                      key={item.name}
                      className="border-border flex items-center gap-3 border-t py-3 first:border-t-0 first:pt-0 last:pb-0"
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${item.dot}`}
                        aria-hidden="true"
                      >
                        {item.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{item.category}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-sm font-medium tabular-nums">
                          {item.currency} {item.amount}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            item.urgent ? "text-status-warning" : "text-status-good"
                          }`}
                        >
                          {item.dueLabel}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-border bg-secondary/40 border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mb-10 flex max-w-xl flex-col gap-3">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Cuatro herramientas, un mismo lugar
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Todo lo que necesitas para dejar de descubrir cobros por accidente en tu estado de
                cuenta.
              </p>
            </div>
            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="border-border flex flex-col gap-3 border-t pt-6">
                  <span className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-medium">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="bg-primary text-primary-foreground flex flex-col items-center gap-6 rounded-2xl px-6 py-14 text-center sm:px-12">
            <h2 className="max-w-md text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Empieza a organizar tus suscripciones hoy
            </h2>
            <p className="text-primary-foreground/80 max-w-md text-sm sm:text-base">
              Crea tu cuenta gratis y ten tus próximos cobros bajo control desde el primer minuto.
            </p>
            <Button asChild size="lg" variant="secondary" className="h-11 px-6 text-base">
              <Link href="/registro">
                Crear cuenta gratis
                <ArrowRight />
              </Link>
            </Button>
            <Link
              href="/iniciar-sesion"
              className="text-primary-foreground/80 hover:text-primary-foreground text-sm underline underline-offset-4"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Wallet className="text-primary size-4" aria-hidden="true" />
            <span className="text-sm font-medium tracking-tight">SubTrack</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} SubTrack. Administra tus suscripciones, evita cobros
            sorpresa.
          </p>
        </div>
      </footer>
    </div>
  );
}
