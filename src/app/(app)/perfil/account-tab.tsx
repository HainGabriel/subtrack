import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function AccountTab({ email }: { email: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tus datos</CardTitle>
          <CardDescription>
            Exporta una copia de tus suscripciones, pagos y demás información en cualquier momento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/importar-exportar">
              <ArrowLeftRight className="size-4" />
              Ir a importar / exportar
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Eliminar cuenta</CardTitle>
          <CardDescription>
            Elimina tu cuenta y todos tus datos de SubTrack de forma permanente. No podrás deshacer
            esta acción.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Separator />
          <DeleteAccountDialog email={email} />
        </CardContent>
      </Card>
    </div>
  );
}
