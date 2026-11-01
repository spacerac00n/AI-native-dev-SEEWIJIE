import { expect, test } from "@playwright/test";

test("Hono health endpoint returns the expected JSON", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3000/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ status: "ok", service: "veriqa-api" });
});

for (const app of [
  { title: "VeriQA Demo", url: "http://127.0.0.1:5173" },
  { title: "VeriQA Dashboard", url: "http://127.0.0.1:5174" },
]) {
  test(`${app.title} renders and checks the real API`, async ({ page }) => {
    await page.goto(app.url);
    await expect(page).toHaveTitle(app.title);
    await expect(page.getByRole("heading", { level: 1, name: app.title })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("API health has not been checked.");

    // No request mocking: the click must reach Hono through this app's Vite proxy.
    await page.getByRole("button", { name: "Check API health" }).click();
    await expect(page.getByRole("status")).toHaveText("API is healthy (veriqa-api).");
  });
}
