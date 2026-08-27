import { emailLayout, emailButton } from "./layout";

export function passwordResetEmail(opts: { name: string; resetUrl: string }) {
  const bodyHtml = `
    <p>Hola ${opts.name},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña de SubTrack. Si no fuiste tú, puedes ignorar este correo.</p>
    ${emailButton(opts.resetUrl, "Restablecer contraseña")}
    <p style="margin-top:24px;color:#6b7280;font-size:13px;">Este enlace vence en 1 hora. Si el botón no funciona, copia y pega esta URL en tu navegador:<br/>${opts.resetUrl}</p>
  `;
  return {
    subject: "Restablece tu contraseña de SubTrack",
    html: emailLayout({ previewText: "Restablece tu contraseña de SubTrack", bodyHtml }),
    text: `Hola ${opts.name},\n\nRestablece tu contraseña en: ${opts.resetUrl}\n\nEste enlace vence en 1 hora.`,
  };
}

export function welcomeEmail(opts: { name: string; appUrl: string }) {
  const bodyHtml = `
    <p>Hola ${opts.name},</p>
    <p>¡Bienvenido a SubTrack! Ya puedes empezar a registrar tus suscripciones y evitar cobros sorpresa.</p>
    ${emailButton(opts.appUrl, "Ir a mi panel")}
  `;
  return {
    subject: "Bienvenido a SubTrack",
    html: emailLayout({ previewText: "Bienvenido a SubTrack", bodyHtml }),
    text: `Hola ${opts.name},\n\n¡Bienvenido a SubTrack! Entra en ${opts.appUrl}`,
  };
}
