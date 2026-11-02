import { randomUUID } from "node:crypto";
import { homeResponseSchema, mockOtpSchema, otpChallengeSchema } from "@veriqa/contracts";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://127.0.0.1:3000/api/demo";
const DEMO = "http://127.0.0.1:5173";
const EMAIL = "synthetic.student@e.ntu.edu.sg";

test.beforeEach(async ({ request }) => {
  // The reset also restores a fixed server clock; no test inherits another's state.
  const response = await request.post(`${API}/__test/reset`);
  expect(response.status()).toBe(200);
});

async function createChallenge(request: APIRequestContext, email = EMAIL) {
  const response = await request.post(`${API}/auth/request-otp`, { data: { email } });
  expect(response.status()).toBe(201);
  const challenge = otpChallengeSchema.parse(await response.json());
  const delivery = await request.get(`${API}/mock-otp/${challenge.challengeId}`);
  expect(delivery.status()).toBe(200);
  return mockOtpSchema.parse(await delivery.json());
}

async function loginApi(request: APIRequestContext, email = EMAIL) {
  const challenge = await createChallenge(request, email);
  const response = await request.post(`${API}/auth/verify-otp`, {
    data: { challengeId: challenge.challengeId, otp: challenge.otp },
  });
  expect(response.status()).toBe(200);
  return homeResponseSchema.parse(await response.json());
}

async function requestOtpInBrowser(page: Page) {
  await page.goto(DEMO);
  await expect(page.getByRole("heading", { name: "Email login" })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByRole("button", { name: "Request OTP", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Local mock OTP delivery" })).toBeVisible();
  await expect(page.getByTestId("mock-otp")).toHaveText(/^\d{6}$/);
  return (await page.getByTestId("mock-otp").innerText()).trim();
}

async function loginBrowser(page: Page) {
  const otp = await requestOtpInBrowser(page);
  await page.getByLabel("OTP", { exact: true }).fill(otp);
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Welcome, ${EMAIL}`, exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${DEMO}/home`);
}

test("valid email and mock OTP create a server-recognised session", async ({ page }) => {
  await loginBrowser(page);
  const response = await page.request.get(`${API}/home`);
  expect(response.status()).toBe(200);
  expect(homeResponseSchema.parse(await response.json()).email).toBe(EMAIL);
  const cookie = (await page.context().cookies()).find((item) => item.name === "veriqa_session");
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Strict", path: "/" });
  expect(await page.evaluate(() => document.cookie)).not.toContain("veriqa_session");
});

for (const email of [
  "synthetic.student@example.com",
  "synthetic.student@ntu.edu.sg",
  "synthetic.student@e.ntu.edu.sg.evil.example",
  "synthetic.student@fakee.ntu.edu.sg",
  "synthetic.student@sub.e.ntu.edu.sg",
  "synthetic.student@e.ntu.edu.sg@evil.example",
  "synthetic.student@E.NTU.EDU.SG",
  "synthetic.student@e.ntu.edu.sg ",
  "synthetic.student@e.ntu.edu.sg\n",
]) {
  test(`backend rejects email ${JSON.stringify(email)}`, async ({ request }) => {
    const response = await request.post(`${API}/auth/request-otp`, { data: { email } });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: "Use a valid email ending exactly with @e.ntu.edu.sg." });
    expect((await request.get(`${API}/home`)).status()).toBe(401);
  });
}

test("email domain rejection is displayed in the login UI", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByLabel("Email", { exact: true }).fill("synthetic.student@example.com");
  await page.getByRole("button", { name: "Request OTP", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Use a valid email ending exactly with @e.ntu.edu.sg.");
  await expect(page.getByRole("heading", { name: "Email login" })).toBeVisible();
  await expect(page.getByTestId("mock-otp")).toHaveCount(0);
});

test("incorrect OTP is rejected without consuming the valid challenge", async ({ page }) => {
  const otp = await requestOtpInBrowser(page);
  // Generated codes are 100000–999999, so this is always a wrong, well-formed code.
  await page.getByLabel("OTP", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Incorrect OTP.");
  expect((await page.request.get(`${API}/home`)).status()).toBe(401);

  await page.getByLabel("OTP", { exact: true }).fill(otp);
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Welcome, ${EMAIL}` })).toBeVisible();
});

test("unknown challenge cannot authenticate with a real OTP", async ({ request }) => {
  const challenge = await createChallenge(request);
  const response = await request.post(`${API}/auth/verify-otp`, {
    data: { challengeId: randomUUID(), otp: challenge.otp },
  });
  expect(response.status()).toBe(404);
  expect((await request.get(`${API}/home`)).status()).toBe(401);
});

test("OTP expires at the five-minute server boundary", async ({ page, request }) => {
  const otp = await requestOtpInBrowser(page);
  const advance = await request.post(`${API}/__test/advance-time`, { data: { milliseconds: 5 * 60 * 1000 } });
  expect(advance.status()).toBe(200);
  await page.getByLabel("OTP", { exact: true }).fill(otp);
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("This OTP has expired. Request a new code.");
  expect((await page.request.get(`${API}/home`)).status()).toBe(401);
});

test("a consumed OTP cannot create another session after logout", async ({ request }) => {
  const challenge = await createChallenge(request);
  const data = { challengeId: challenge.challengeId, otp: challenge.otp };
  expect((await request.post(`${API}/auth/verify-otp`, { data })).status()).toBe(200);
  expect((await request.post(`${API}/auth/logout`)).status()).toBe(204);
  const replay = await request.post(`${API}/auth/verify-otp`, { data });
  expect(replay.status()).toBe(409);
  expect(await replay.json()).toEqual({ error: "This OTP has already been used." });
  expect((await request.get(`${API}/home`)).status()).toBe(401);
});

test("home and task writes reject unauthenticated and forged-session requests", async ({ page, request }) => {
  const home = await request.get(`${API}/home`);
  expect(home.status()).toBe(401);
  expect(await home.json()).toEqual({ error: "Authentication required." });
  expect((await request.patch(`${API}/tasks/review-requirements`, { data: { completed: true } })).status()).toBe(401);
  expect((await request.get(`${API}/home`, { headers: { Cookie: "veriqa_session=forged" } })).status()).toBe(401);
  await page.goto(`${DEMO}/home`);
  await expect(page).toHaveURL(`${DEMO}/login`);
  await expect(page.getByRole("heading", { name: "Email login" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("task changes reach the backend and survive a browser refresh", async ({ page }) => {
  await loginBrowser(page);
  const task = page.getByRole("checkbox", { name: "Review demo requirements" });
  await expect(task).not.toBeChecked();
  await task.check();
  await expect(task).toBeChecked();
  // Enabled again means the pending server write has finished, not just a local toggle.
  await expect(task).toBeEnabled();
  const response = await page.request.get(`${API}/home`);
  expect(response.status()).toBe(200);
  const home = homeResponseSchema.parse(await response.json());
  expect(home.tasks.find((item) => item.id === "review-requirements")?.completed).toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { name: `Welcome, ${EMAIL}` })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Review demo requirements" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Review demo requirements" }).uncheck();
  await expect(page.getByRole("checkbox", { name: "Review demo requirements" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Review demo requirements" })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Review demo requirements" })).not.toBeChecked();
});

test("logout invalidates the server session even when its old cookie is replayed", async ({ page }) => {
  await loginBrowser(page);
  const cookie = (await page.context().cookies()).find((item) => item.name === "veriqa_session");
  expect(cookie).toBeDefined();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Email login" })).toBeVisible();
  expect((await page.request.get(`${API}/home`)).status()).toBe(401);
  const headers = { Cookie: `veriqa_session=${cookie!.value}` };
  expect((await page.request.get(`${API}/home`, { headers })).status()).toBe(401);
  expect((await page.request.patch(`${API}/tasks/run-baseline`, {
    headers, data: { completed: true },
  })).status()).toBe(401);
  await page.goto(`${DEMO}/home`);
  await expect(page.getByRole("heading", { name: "Email login" })).toBeVisible();
});

test("tasks are isolated by email and persist through a new login", async ({ request }) => {
  await loginApi(request);
  expect((await request.patch(`${API}/tasks/run-baseline`, { data: { completed: true } })).status()).toBe(200);
  expect((await request.post(`${API}/auth/logout`)).status()).toBe(204);
  const otherHome = await loginApi(request, "synthetic.other@e.ntu.edu.sg");
  expect(otherHome.tasks.every((task) => !task.completed)).toBe(true);
  const originalHome = await loginApi(request);
  expect(originalHome.tasks.find((task) => task.id === "run-baseline")?.completed).toBe(true);
});

test("server rejects a session at the one-hour expiry boundary", async ({ request }) => {
  await loginApi(request);
  const advance = await request.post(`${API}/__test/advance-time`, { data: { milliseconds: 60 * 60 * 1000 } });
  expect(advance.status()).toBe(200);
  expect((await request.get(`${API}/home`)).status()).toBe(401);
  expect((await request.patch(`${API}/tasks/run-baseline`, { data: { completed: true } })).status()).toBe(401);
});

test("malformed auth and task payloads do not mutate valid state", async ({ request }) => {
  expect((await request.post(`${API}/auth/request-otp`, {
    data: "not-json", headers: { "Content-Type": "application/json" },
  })).status()).toBe(400);
  expect((await request.post(`${API}/auth/verify-otp`, {
    data: { challengeId: randomUUID(), otp: "123" },
  })).status()).toBe(400);
  await loginApi(request);
  expect((await request.patch(`${API}/tasks/run-baseline`, { data: { completed: "true" } })).status()).toBe(400);
  expect((await request.patch(`${API}/tasks/missing`, { data: { completed: true } })).status()).toBe(404);
  const home = homeResponseSchema.parse(await (await request.get(`${API}/home`)).json());
  expect(home.tasks.every((task) => !task.completed)).toBe(true);
});
