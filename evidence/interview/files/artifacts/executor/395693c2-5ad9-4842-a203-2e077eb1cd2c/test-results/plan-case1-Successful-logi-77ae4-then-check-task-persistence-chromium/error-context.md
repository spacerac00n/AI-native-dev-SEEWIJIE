# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plan.spec.ts >> case1: Successful login with valid @e.ntu.edu.sg email, OTP, then check task persistence
- Location: tests/executor/plan.spec.ts:18:3

# Error details

```
Error: expect(locator).toBeChecked() failed

Locator:  getByRole('checkbox', { name: 'Review demo requirements', exact: true })
Expected: checked
Received: unchecked
Timeout:  3000ms

Call log:
  - Expect "toBeChecked" getByRole('checkbox', { name: 'Review demo requirements', exact: true }) with timeout 3000ms
  - waiting for getByRole('checkbox', { name: 'Review demo requirements', exact: true })
    10 × locator resolved to <input type="checkbox"/>
       - unexpected value "unchecked"

```

# Page snapshot

```yaml
- main [ref=f1e3]:
  - heading "VeriQA Demo" [level=1] [ref=f1e4]
  - generic [ref=f1e5]:
    - heading "Welcome, synthetic.student@e.ntu.edu.sg" [level=2] [ref=f1e6]
    - heading "Your checklist" [level=3] [ref=f1e7]
    - list [ref=f1e8]:
      - listitem [ref=f1e9]:
        - generic [ref=f1e10]:
          - checkbox "Review demo requirements" [ref=f1e11]
          - text: Review demo requirements
      - listitem [ref=f1e12]:
        - generic [ref=f1e13]:
          - checkbox "Run baseline tests" [ref=f1e14]
          - text: Run baseline tests
    - button "Logout" [ref=f1e15]
  - separator [ref=f1e16]
  - button "Check API health" [ref=f1e17]
  - status [ref=f1e18]: API health has not been checked.
```

# Test source

```ts
  29  | export async function performAction(page: Page, action: TestAction, values: { otp?: string }) {
  30  |   switch (action.type) {
  31  |     case "navigate": {
  32  |       await page.goto(`${DEMO}${action.path}`);
  33  |       // Initial session lookup must finish before later actions/assertions observe the UI.
  34  |       await expect(page.getByText("Checking your session...", { exact: true })).toHaveCount(0);
  35  |       await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  36  |       return;
  37  |     }
  38  |     case "fill": {
  39  |       const value = typeof action.value === "string" ? action.value : values.otp;
  40  |       if (value === undefined) throw new Error("Mock OTP is not available in this case");
  41  |       await target(page, action.input).fill(value);
  42  |       return;
  43  |     }
  44  |     case "read_mock_otp": {
  45  |       const output = target(page, "mock-otp");
  46  |       await expect(output).toHaveText(/^\d{6}$/);
  47  |       values.otp = (await output.innerText()).trim();
  48  |       return;
  49  |     }
  50  |     case "click": {
  51  |       const locator = target(page, action.target);
  52  |       const endpoints: Partial<Record<typeof action.target, string>> = {
  53  |         "request-otp": "/api/demo/auth/request-otp", "verify-otp": "/api/demo/auth/verify-otp",
  54  |         logout: "/api/demo/auth/logout", "check-health": "/api/health",
  55  |         "review-requirements": "/api/demo/tasks/review-requirements", "run-baseline": "/api/demo/tasks/run-baseline",
  56  |       };
  57  |       const endpoint = endpoints[action.target];
  58  |       if (endpoint) {
  59  |         await Promise.all([
  60  |           page.waitForResponse((response) => response.url() === `${DEMO}${endpoint}`),
  61  |           locator.click(),
  62  |         ]);
  63  |         // A response precedes React's state update. Wait for the form/write to settle before navigation.
  64  |         await expect.poll(async () => await locator.count() === 0 || await locator.isEnabled()).toBe(true);
  65  |         if (action.target === "check-health") await expect(target(page, "health-status")).not.toHaveText("Checking API...");
  66  |       } else await locator.click();
  67  |       return;
  68  |     }
  69  |   }
  70  | }
  71  | 
  72  | export class AssertionFailure extends Error {}
  73  | 
  74  | export async function verifyAssertion(page: Page, definition: ExpectedAssertion, index: number,
  75  |   observations: CaseExecution["assertions"], apiLog: (value: unknown) => void) {
  76  |   let expected: unknown;
  77  |   let readActual: () => Promise<unknown> = async () => null;
  78  |   let verify: () => Promise<void>;
  79  |   switch (definition.type) {
  80  |     case "url":
  81  |       expected = `${DEMO}${definition.path}`;
  82  |       readActual = async () => page.url();
  83  |       verify = async () => { await expect(page).toHaveURL(expected as string); };
  84  |       break;
  85  |     case "visible": {
  86  |       const locator = target(page, definition.target);
  87  |       expected = definition.expected;
  88  |       readActual = async () => locator.isVisible();
  89  |       verify = async () => { await expect(locator).toBeVisible({ visible: definition.expected }); };
  90  |       break;
  91  |     }
  92  |     case "text": {
  93  |       const locator = target(page, definition.target);
  94  |       expected = definition.expected;
  95  |       readActual = async () => await locator.count() ? locator.textContent() : null;
  96  |       verify = async () => { await expect(locator).toHaveText(definition.expected); };
  97  |       break;
  98  |     }
  99  |     case "checked": {
  100 |       const locator = target(page, definition.target);
  101 |       expected = definition.expected;
  102 |       readActual = async () => await locator.count() ? locator.isChecked() : null;
  103 |       verify = async () => { await expect(locator).toBeChecked({ checked: definition.expected }); };
  104 |       break;
  105 |     }
  106 |     case "api": {
  107 |       expected = definition.expected;
  108 |       // Context request shares the real browser session, rather than creating a fake logged-in API client.
  109 |       const response = await page.request.get(`${API}/api/${definition.operation === "health" ? "health" : "demo/home"}`,
  110 |         { timeout: 5_000, maxRedirects: 0 });
  111 |       const body: unknown = await response.json();
  112 |       apiLog({ operation: definition.operation, status: response.status(), body });
  113 |       const actual = definition.operation === "health" ? { status: response.status(), body }
  114 |         : { status: response.status(), ...(body !== null && typeof body === "object"
  115 |           ? ("email" in definition.expected ? { email: (body as { email?: unknown }).email }
  116 |             : { error: (body as { error?: unknown }).error }) : { body }) };
  117 |       readActual = async () => actual;
  118 |       verify = async () => { expect(actual).toEqual(definition.expected); };
  119 |       break;
  120 |     }
  121 |   }
  122 |   try {
  123 |     await verify();
  124 |     observations.push({ index, definition, expected, actual: await readActual(), status: "passed" });
  125 |   } catch (error) {
  126 |     const assertion = error instanceof Error && "matcherResult" in error;
  127 |     observations.push({ index, definition, expected, actual: await readActual().catch(() => null),
  128 |       status: assertion ? "failed" : "execution-error" });
> 129 |     if (assertion) throw new AssertionFailure(error.message);
      |                          ^ Error: expect(locator).toBeChecked() failed
  130 |     throw error;
  131 |   }
  132 | }
  133 | 
```