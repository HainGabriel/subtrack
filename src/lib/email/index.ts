import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface CapturedEmail extends OutgoingEmail {
  sentAt: string;
}

// Bandeja de desarrollo en memoria: permite verificar en
// /panel/dev/correos qué se habría enviado, sin depender de un
// proveedor externo. Se reinicia con cada reinicio del proceso.
const devInbox: CapturedEmail[] = [];
const DEV_INBOX_MAX = 50;

export function getDevInbox(): CapturedEmail[] {
  return [...devInbox].reverse();
}

// Perezoso a propósito: leer `env.RESEND_API_KEY` al importar el módulo
// rompe el build de Docker (`next build` analiza las rutas en una etapa
// sin variables reales) — se resuelve en el primer envío real.
let resend: Resend | null | undefined;
function getResendClient(): Resend | null {
  if (resend === undefined) {
    resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }
  return resend;
}

/**
 * Envía un correo. En producción con RESEND_API_KEY configurado usa
 * Resend; en su ausencia (siempre en desarrollo local) registra el
 * correo de forma segura (sin credenciales) en logs y en la bandeja de
 * desarrollo, para que el flujo completo se pueda probar sin pagar un
 * proveedor externo.
 */
export async function sendEmail(email: OutgoingEmail): Promise<{ delivered: boolean }> {
  const resend = getResendClient();
  if (resend) {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (result.error) {
      console.error("[email] Resend rechazó el envío", {
        subject: email.subject,
        error: result.error.message,
      });
      return { delivered: false };
    }
    return { delivered: true };
  }

  const captured: CapturedEmail = { ...email, sentAt: new Date().toISOString() };
  devInbox.push(captured);
  if (devInbox.length > DEV_INBOX_MAX) devInbox.shift();

  console.log(`[email:dev] Para: ${email.to} · Asunto: ${email.subject}`);
  return { delivered: true };
}
