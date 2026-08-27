import { test, expect } from "@playwright/test";
import { makeTestUser, registerAndOnboard, logout } from "./fixtures";

test.describe("Flujo completo de suscripciones", () => {
  test("crear suscripción → verla en el panel → registrar pago → filtrar → exportar → cerrar sesión", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const user = makeTestUser("flujo");
    await registerAndOnboard(page, user);

    // Crear suscripción
    await page.getByRole("link", { name: "Nueva suscripción" }).click();
    await page.waitForURL("**/suscripciones/nueva");
    await page.getByLabel("Nombre").fill("Netflix E2E");
    await page.getByPlaceholder("Ej. Netflix Inc.").fill("Netflix Inc.");
    await page.getByLabel("Importe", { exact: true }).fill("15.99");
    await page.getByRole("button", { name: "Crear suscripción" }).click();

    await page.waitForURL(/\/suscripciones\/(?!nueva$)[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: "Netflix E2E" })).toBeVisible();
    await expect(page.getByText("Activa")).toBeVisible();

    // Verla reflejada en el panel. Se navega con goto() en vez de clicar el
    // enlace del sidebar: en el viewport móvil el sidebar vive detrás de un
    // drawer, y este flujo prueba los datos, no la navegación responsive.
    await page.goto("/panel");
    await expect(page.getByText("Netflix E2E", { exact: true })).toBeVisible();

    // Registrar un pago
    await page.getByText("Netflix E2E", { exact: true }).first().click();
    await page.waitForURL(/\/suscripciones\/(?!nueva$)[a-z0-9]+$/);
    await page.getByRole("button", { name: "Registrar pago" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Pago registrado")).toBeVisible();
    await expect(page.getByText("Pagado")).toBeVisible();

    // Filtrar el listado
    await page.goto("/suscripciones");
    await page.getByPlaceholder("Buscar por nombre o proveedor...").fill("Netflix");
    await expect(page.getByText("Netflix E2E")).toBeVisible();
    await page.getByPlaceholder("Buscar por nombre o proveedor...").fill("Inexistente-XYZ");
    await expect(page.getByText("Sin resultados")).toBeVisible();

    // Exportar datos (JSON) — no debe lanzar error de consola
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/importar-exportar");
    await page.getByRole("tab", { name: "Exportar" }).click();
    await page.getByRole("button", { name: "Exportar todo (JSON)" }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);

    // Cerrar sesión
    await logout(page, user);
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  });
});
