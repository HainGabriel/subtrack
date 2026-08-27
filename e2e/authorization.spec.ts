import { test, expect } from "@playwright/test";
import { makeTestUser, registerAndOnboard } from "./fixtures";

test.describe("Autorización entre usuarios", () => {
  test("un usuario nunca accede a los datos de otro usuario", async ({ browser }) => {
    // Dos registros + onboarding completos en secuencia son legítimamente
    // más lentos que el timeout por defecto de Playwright.
    test.setTimeout(60000);
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      const userA = makeTestUser("propietario");
      const userB = makeTestUser("intruso");

      await registerAndOnboard(pageA, userA);
      await registerAndOnboard(pageB, userB);

      // Usuario A crea una suscripción.
      await pageA.getByRole("link", { name: "Nueva suscripción" }).click();
      await pageA.waitForURL("**/suscripciones/nueva");
      await pageA.getByLabel("Nombre").fill("Secreto de A");
      await pageA.getByLabel("Importe", { exact: true }).fill("42");
      await pageA.getByRole("button", { name: "Crear suscripción" }).click();
      await pageA.waitForURL(/\/suscripciones\/(?!nueva$)[a-z0-9]+$/);
      const subscriptionUrl = pageA.url();

      // El usuario B no la ve en su propio listado.
      await pageB.goto("/suscripciones");
      await expect(pageB.getByText("Secreto de A")).not.toBeVisible();

      // El usuario B tampoco puede acceder a ella por URL directa (IDOR).
      await pageB.goto(subscriptionUrl);
      await expect(pageB.getByText("Esta página no existe")).toBeVisible();

      // Ni editarla.
      await pageB.goto(`${subscriptionUrl}/editar`);
      await expect(pageB.getByText("Esta página no existe")).toBeVisible();
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
