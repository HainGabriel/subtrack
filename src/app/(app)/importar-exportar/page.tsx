"use client";

import { useRef, useState, useTransition } from "react";
import { DownloadIcon, UploadIcon, FileTextIcon, CalendarIcon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  downloadTemplateAction,
  previewImportAction,
  confirmImportAction,
  exportDataAction,
  exportIcsAction,
  type ConfirmImportData,
} from "@/lib/actions/import-export-actions";
import type { ParsedImportRow } from "@/lib/domain/csv-import";

/** Dispara la descarga de un archivo de texto en el navegador. */
function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ImportarExportarPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Importar / Exportar</h1>
        <p className="text-muted-foreground text-sm">
          Sube suscripciones en lote desde un CSV, o exporta todos tus datos para respaldarlos o
          llevártelos a otra herramienta.
        </p>
      </div>

      <Tabs defaultValue="importar">
        <TabsList>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="importar">
          <ImportTab />
        </TabsContent>

        <TabsContent value="exportar">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [parseErrorCount, setParseErrorCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [summary, setSummary] = useState<ConfirmImportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isConfirming, startConfirm] = useTransition();

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  function handleDownloadTemplate() {
    startPreview(async () => {
      const result = await downloadTemplateAction();
      if (result.success) {
        downloadTextFile("plantilla-suscripciones.csv", result.data.csv, "text/csv;charset=utf-8");
      } else {
        setError(result.error);
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSummary(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      startPreview(async () => {
        const result = await previewImportAction(content);
        if (!result.success) {
          setError(result.error);
          setRows([]);
          return;
        }
        setRows(result.data.rows);
        setParseErrorCount(result.data.errors.length);
        setDuplicateCount(result.data.duplicateCount);
      });
    };
    reader.readAsText(file);
  }

  function handleConfirm() {
    setError(null);
    startConfirm(async () => {
      const result = await confirmImportAction(rows, { skipDuplicates });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSummary(result.data);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Descarga la plantilla</CardTitle>
          <CardDescription>
            Un CSV con solo el encabezado, en el orden exacto de columnas que espera el importador.
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-t-0 bg-transparent pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={isPreviewing}
          >
            <DownloadIcon /> Descargar plantilla CSV
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Sube tu archivo</CardTitle>
          <CardDescription>
            Selecciona el CSV completado para ver una vista previa antes de importar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPreviewing}
            >
              <UploadIcon /> Elegir archivo CSV
            </Button>
            {fileName && <span className="text-muted-foreground text-sm">{fileName}</span>}
            {isPreviewing && <Spinner />}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo procesar el archivo</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">{rows.length} filas leídas</Badge>
                <Badge>{validCount} válidas</Badge>
                {invalidCount > 0 && <Badge variant="destructive">{invalidCount} con error</Badge>}
                {duplicateCount > 0 && (
                  <Badge variant="secondary">{duplicateCount} posibles duplicados</Badge>
                )}
                {parseErrorCount > 0 && (
                  <span className="text-muted-foreground">
                    ({parseErrorCount} mensajes de validación)
                  </span>
                )}
              </div>

              <div className="border-border max-h-96 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Fecha inicio</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.row}>
                        <TableCell>{row.row}</TableCell>
                        <TableCell>
                          {!row.valid ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : row.duplicate ? (
                            <Badge variant="secondary">Duplicada</Badge>
                          ) : (
                            <Badge>Válida</Badge>
                          )}
                        </TableCell>
                        <TableCell>{row.data?.name ?? row.raw["nombre"] ?? "—"}</TableCell>
                        <TableCell>
                          {row.data?.categoryName ?? row.raw["categoria"] ?? "—"}
                        </TableCell>
                        <TableCell>
                          {row.data
                            ? `${row.data.amount} ${row.data.currency}`
                            : (row.raw["importe"] ?? "—")}
                        </TableCell>
                        <TableCell>
                          {row.data?.billingFrequency ?? row.raw["frecuencia"] ?? "—"}
                        </TableCell>
                        <TableCell>
                          {row.data
                            ? row.data.startDate.toISOString().slice(0, 10)
                            : (row.raw["fecha_inicio"] ?? "—")}
                        </TableCell>
                        <TableCell className="text-destructive max-w-64 text-xs text-wrap">
                          {row.errorMessages?.join("; ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="skip-duplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                />
                <Label htmlFor="skip-duplicates" className="text-sm font-normal">
                  Omitir duplicados al importar
                </Label>
              </div>

              <div>
                <Button onClick={handleConfirm} disabled={isConfirming || validCount === 0}>
                  {isConfirming && <Spinner />} Confirmar importación
                </Button>
              </div>
            </>
          )}

          {summary && (
            <Alert>
              <AlertTitle>Importación completada</AlertTitle>
              <AlertDescription>
                <p>
                  {summary.imported} suscripciones importadas · {summary.skipped} filas omitidas
                  {summary.errors.length > 0 && ` · ${summary.errors.length} con error`}
                </p>
                {summary.errors.length > 0 && (
                  <ul className="mt-1 list-disc pl-4">
                    {summary.errors.map((e) => (
                      <li key={e.row}>
                        Fila {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExportTab() {
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(label: string, task: () => Promise<void>) {
    setError(null);
    setPendingAction(label);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setPendingAction(null);
      }
    });
  }

  function exportSubscriptionsCsv() {
    run("subscriptions-csv", async () => {
      const result = await exportDataAction("csv");
      if (!result.success) return setError(result.error);
      if (result.data.format !== "csv") return;
      downloadTextFile(
        `suscripciones-${todayStamp()}.csv`,
        result.data.subscriptionsCsv,
        "text/csv;charset=utf-8"
      );
    });
  }

  function exportPaymentsCsv() {
    run("payments-csv", async () => {
      const result = await exportDataAction("csv");
      if (!result.success) return setError(result.error);
      if (result.data.format !== "csv") return;
      downloadTextFile(
        `pagos-${todayStamp()}.csv`,
        result.data.paymentsCsv,
        "text/csv;charset=utf-8"
      );
    });
  }

  function exportJson() {
    run("json", async () => {
      const result = await exportDataAction("json");
      if (!result.success) return setError(result.error);
      if (result.data.format !== "json") return;
      downloadTextFile(
        `subtrack-datos-${todayStamp()}.json`,
        JSON.stringify(result.data.json, null, 2),
        "application/json;charset=utf-8"
      );
    });
  }

  function exportIcs() {
    run("ics", async () => {
      const result = await exportIcsAction();
      if (!result.success) return setError(result.error);
      downloadTextFile(
        `subtrack-calendario-${todayStamp()}.ics`,
        result.data.ics,
        "text/calendar;charset=utf-8"
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar tus datos</CardTitle>
        <CardDescription>
          Descarga tus suscripciones y pagos en CSV, todos tus datos en JSON, o un calendario con
          tus próximos cobros.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo generar la exportación</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportSubscriptionsCsv} disabled={isPending}>
            {pendingAction === "subscriptions-csv" ? <Spinner /> : <FileTextIcon />}
            Exportar suscripciones CSV
          </Button>
          <Button variant="outline" onClick={exportPaymentsCsv} disabled={isPending}>
            {pendingAction === "payments-csv" ? <Spinner /> : <FileTextIcon />}
            Exportar pagos CSV
          </Button>
          <Button variant="outline" onClick={exportJson} disabled={isPending}>
            {pendingAction === "json" ? <Spinner /> : <DownloadIcon />}
            Exportar todo (JSON)
          </Button>
          <Button variant="outline" onClick={exportIcs} disabled={isPending}>
            {pendingAction === "ics" ? <Spinner /> : <CalendarIcon />}
            Exportar calendario (.ics)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
