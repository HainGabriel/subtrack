import type { Page } from "@playwright/test";

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export function makeTestUser(prefix: string): TestUser {
  const unique = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    name: `E2E ${prefix}`,
    email: `${unique}@e2e.subtrack.test`,
    password: "ContraseñaFuerte1",
  };
}

/** Registra un usuario nuevo y completa el wizard de onboarding con los valores por defecto. */
export async function registerAndOnboard(page: Page, user: TestUser) {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill(user.name);
  await page.getByLabel("Correo").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(user.password);
  await page.getByLabel("Confirma tu contraseña").fill(user.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Finalizar" }).click();
  await page.waitForURL("**/panel");
}

export async function logout(page: Page, user: Pick<TestUser, "name">) {
  await page.getByRole("button", { name: `Menú de usuario: ${user.name}` }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/");
  // Confirma que la sesión realmente terminó (cookie limpiada), no solo que
  // la URL cambió — evita una condición de carrera con el redirect interno
  // de Auth.js si una navegación posterior llega antes de que se asiente.
  await page.getByRole("link", { name: "Iniciar sesión" }).waitFor();
}

export async function login(page: Page, user: Pick<TestUser, "email" | "password">) {
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/panel");
}
