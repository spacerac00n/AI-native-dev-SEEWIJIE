import { expect, type Locator, type Page } from "@playwright/test";
import type { CaseExecution, ExpectedAssertion, TestAction } from "@veriqa/contracts";

// These addresses and locators are repository-owned. Plans cannot supply network origins or selectors.
export const DEMO = "http://127.0.0.1:5173";
export const API = "http://127.0.0.1:3000";
const taskNames = { "review-requirements": "Review demo requirements", "run-baseline": "Run baseline tests" };

function target(page: Page, name: string): Locator {
  switch (name) {
    case "email": return page.getByLabel("Email", { exact: true });
    case "otp": return page.getByLabel("OTP", { exact: true });
    case "request-otp": return page.getByRole("button", { name: "Request OTP", exact: true });
    case "verify-otp": return page.getByRole("button", { name: "Verify OTP", exact: true });
    case "logout": return page.getByRole("button", { name: "Logout", exact: true });
    case "different-email": return page.getByRole("button", { name: "Use a different email", exact: true });
    case "check-health": return page.getByRole("button", { name: "Check API health", exact: true });
    case "review-requirements": case "run-baseline": return page.getByRole("checkbox", { name: taskNames[name], exact: true });
    case "login-heading": return page.getByRole("heading", { name: "Email login", exact: true });
    case "otp-heading": return page.getByRole("heading", { name: "Verify OTP", exact: true });
    case "welcome-heading": return page.getByRole("heading", { name: /^Welcome, / });
    case "error-message": return page.getByRole("alert");
    case "mock-otp": return page.getByTestId("mock-otp");
    case "health-status": return page.getByRole("status");
    default: throw new Error("Unsupported adapter target");
  }
}

export async function performAction(page: Page, action: TestAction, values: { otp?: string }) {
  switch (action.type) {
    case "navigate": {
      await page.goto(`${DEMO}${action.path}`);
      // Initial session lookup must finish before later actions/assertions observe the UI.
      await expect(page.getByText("Checking your session...", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
      return;
    }
    case "fill": {
      const value = typeof action.value === "string" ? action.value : values.otp;
      if (value === undefined) throw new Error("Mock OTP is not available in this case");
      await target(page, action.input).fill(value);
      return;
    }
    case "read_mock_otp": {
      const output = target(page, "mock-otp");
      await expect(output).toHaveText(/^\d{6}$/);
      values.otp = (await output.innerText()).trim();
      return;
    }
    case "click": {
      const locator = target(page, action.target);
      const endpoints: Partial<Record<typeof action.target, string>> = {
        "request-otp": "/api/demo/auth/request-otp", "verify-otp": "/api/demo/auth/verify-otp",
        logout: "/api/demo/auth/logout", "check-health": "/api/health",
        "review-requirements": "/api/demo/tasks/review-requirements", "run-baseline": "/api/demo/tasks/run-baseline",
      };
      const endpoint = endpoints[action.target];
      if (endpoint) {
        await Promise.all([
          page.waitForResponse((response) => response.url() === `${DEMO}${endpoint}`),
          locator.click(),
        ]);
        // A response precedes React's state update. Wait for the form/write to settle before navigation.
        await expect.poll(async () => await locator.count() === 0 || await locator.isEnabled()).toBe(true);
        if (action.target === "check-health") await expect(target(page, "health-status")).not.toHaveText("Checking API...");
      } else await locator.click();
      return;
    }
  }
}

export class AssertionFailure extends Error {}

export async function verifyAssertion(page: Page, definition: ExpectedAssertion, index: number,
  observations: CaseExecution["assertions"], apiLog: (value: unknown) => void) {
  let expected: unknown;
  let readActual: () => Promise<unknown> = async () => null;
  let verify: () => Promise<void>;
  switch (definition.type) {
    case "url":
      expected = `${DEMO}${definition.path}`;
      readActual = async () => page.url();
      verify = async () => { await expect(page).toHaveURL(expected as string); };
      break;
    case "visible": {
      const locator = target(page, definition.target);
      expected = definition.expected;
      readActual = async () => locator.isVisible();
      verify = async () => { await expect(locator).toBeVisible({ visible: definition.expected }); };
      break;
    }
    case "text": {
      const locator = target(page, definition.target);
      expected = definition.expected;
      readActual = async () => await locator.count() ? locator.textContent() : null;
      verify = async () => { await expect(locator).toHaveText(definition.expected); };
      break;
    }
    case "checked": {
      const locator = target(page, definition.target);
      expected = definition.expected;
      readActual = async () => await locator.count() ? locator.isChecked() : null;
      verify = async () => { await expect(locator).toBeChecked({ checked: definition.expected }); };
      break;
    }
    case "api": {
      expected = definition.expected;
      // Context request shares the real browser session, rather than creating a fake logged-in API client.
      const response = await page.request.get(`${API}/api/${definition.operation === "health" ? "health" : "demo/home"}`,
        { timeout: 5_000, maxRedirects: 0 });
      const body: unknown = await response.json();
      apiLog({ operation: definition.operation, status: response.status(), body });
      const actual = definition.operation === "health" ? { status: response.status(), body }
        : { status: response.status(), ...(body !== null && typeof body === "object"
          ? ("email" in definition.expected ? { email: (body as { email?: unknown }).email }
            : { error: (body as { error?: unknown }).error }) : { body }) };
      readActual = async () => actual;
      verify = async () => { expect(actual).toEqual(definition.expected); };
      break;
    }
  }
  try {
    await verify();
    observations.push({ index, definition, expected, actual: await readActual(), status: "passed" });
  } catch (error) {
    const assertion = error instanceof Error && "matcherResult" in error;
    observations.push({ index, definition, expected, actual: await readActual().catch(() => null),
      status: assertion ? "failed" : "execution-error" });
    if (assertion) throw new AssertionFailure(error.message);
    throw error;
  }
}
