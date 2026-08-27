import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { getDevInbox } from "@/lib/email";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function DevInboxPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  await requireUser();
  const emails = getDevInbox();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Bandeja de desarrollo</h1>
        <p className="text-muted-foreground text-sm">
          Correos capturados en memoria porque no hay un proveedor de envío configurado
          (RESEND_API_KEY). Solo visible fuera de producción.
        </p>
      </div>

      {emails.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
            <Mail className="size-8" aria-hidden="true" />
            Todavía no se ha capturado ningún correo en esta sesión del servidor.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {emails.map((email, index) => (
            <Card key={`${email.sentAt}-${index}`}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">{email.subject}</CardTitle>
                  <CardDescription>Para: {email.to}</CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {new Date(email.sentAt).toLocaleString("es-DO")}
                </Badge>
              </CardHeader>
              <CardContent>
                <iframe
                  title={`Vista previa: ${email.subject}`}
                  sandbox=""
                  srcDoc={email.html}
                  className="border-border h-96 w-full rounded-lg border bg-white"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
