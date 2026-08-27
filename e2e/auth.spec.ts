import { test, expect } from "@playwright/test";
import { makeTestUser, registerAndOnboard, login, logout } from "./fixtures";

test.describe("Registro, onboarding y sesión", () => {
  test("un usuario nuevo se registra, completa el onboarding y llega a un panel vacío", async ({
    page,
  }) => {
    const user = makeTestUser("registro");
    await registerAndOnboard(page, user);

    await expect(
      page.getByRole("heading", { name: `Hola, ${user.name.split(" ")[0]}` })
    ).toBeVisible();
    await expect(page.getByText("Sin renovaciones próximas")).toBeVisible();
  });

  test("cerrar sesión termina la sesión de verdad", async ({ page }) => {
    const user = makeTestUser("logout");
    await registerAndOnboard(page, user);

    await logout(page, user);
    // Confirmación fuerte de que la cookie de sesión ya no es válida: una
    // ruta protegida debe volver a redirigir, no solo "verse" en la
    // landing (que también se renderiza para visitantes sin sesión).
    await page.goto("/panel");
    await page.waitForURL("**/iniciar-sesion**");
  });

  test("volver a iniciar sesión con una cuenta ya registrada funciona", async ({ browser }) => {
    const user = makeTestUser("relogin");
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();
    await registerAndOnboard(setupPage, user);
    await logout(setupPage, user);
    await setupContext.close();

    // Sesión de navegador nueva, como alguien volviendo más tarde.
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, user);
    await expect(page).toHaveURL(/\/panel$/);
    await context.close();
  });

  test("una ruta protegida redirige a iniciar sesión cuando no hay sesión", async ({ page }) => {
    await page.goto("/panel");
    await page.waitForURL("**/iniciar-sesion**");
    await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
  });

  test("credenciales inválidas muestran un error genérico sin revelar si el correo existe", async ({
    page,
  }) => {
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo").fill("no-existe@e2e.subtrack.test");
    await page.getByLabel("Contraseña").fill("loquesea123");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByText(/correo o contraseña/i)).toBeVisible();
    await expect(page).toHaveURL(/\/iniciar-sesion/);
  });

  test("recuperar contraseña responde igual exista o no el correo", async ({ page }) => {
    await page.goto("/recuperar-contrasena");
    await page.getByLabel("Correo").fill("no-existe@e2e.subtrack.test");
    await page.getByRole("button", { name: /enviar/i }).click();
    await expect(page.getByText(/si existe una cuenta con ese correo/i)).toBeVisible();
  });
});
