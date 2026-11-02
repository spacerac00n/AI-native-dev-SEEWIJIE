import { randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  emailLoginRequestSchema,
  updateTaskRequestSchema,
  verifyOtpRequestSchema,
  type DemoHome,
  type DemoTask,
} from "@veriqa/contracts";
import { Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const SESSION_LIFETIME_MS = 60 * 60 * 1000;
const SESSION_COOKIE = "veriqa_session";
const TEST_START_TIME = Date.UTC(2026, 0, 1);

type Challenge = {
  email: string;
  otp: string;
  expiresAt: number;
  used: boolean;
};
type Session = { email: string; expiresAt: number };
type DemoEnv = { Variables: { email: string } };

export function createDemoRoutes(testMode: boolean) {
  const demo = new Hono<DemoEnv>();
  const challenges = new Map<string, Challenge>();
  const sessions = new Map<string, Session>();
  const tasksByEmail = new Map<string, DemoTask[]>();
  let testTime = TEST_START_TIME;

  // Production/demo time is real. Only the opted-in Playwright server uses a fixed clock.
  const now = () => testMode ? testTime : Date.now();

  function homeFor(email: string): DemoHome {
    let tasks = tasksByEmail.get(email);
    if (!tasks) {
      tasks = [
        { id: "review-requirements", title: "Review demo requirements", completed: false },
        { id: "run-baseline", title: "Run baseline tests", completed: false },
      ];
      tasksByEmail.set(email, tasks);
    }
    return { email, tasks };
  }

  // Protected responses must not be served from a browser cache after logout.
  demo.use("*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    await next();
  });

  demo.post("/auth/request-otp", async (context) => {
    const parsed = emailLoginRequestSchema.safeParse(await context.req.json().catch(() => null));
    // No trimming or case conversion: the requested suffix must match exactly.
    if (!parsed.success || !parsed.data.email.endsWith("@e.ntu.edu.sg")) {
      return context.json({ error: "Use a valid email ending exactly with @e.ntu.edu.sg." }, 400);
    }

    const challengeId = randomUUID();
    const expiresAt = now() + OTP_LIFETIME_MS;
    challenges.set(challengeId, {
      email: parsed.data.email,
      otp: randomInt(100000, 1000000).toString(),
      expiresAt,
      used: false,
    });
    return context.json({ challengeId, expiresAt }, 201);
  });

  // This local mock inbox is deliberately visible; no email is ever delivered.
  demo.get("/mock-otp/:challengeId", (context) => {
    const challengeId = context.req.param("challengeId");
    const challenge = challenges.get(challengeId);
    if (!challenge) return context.json({ error: "OTP challenge not found." }, 404);
    return context.json({ challengeId, otp: challenge.otp, expiresAt: challenge.expiresAt });
  });

  demo.post("/auth/verify-otp", async (context) => {
    const parsed = verifyOtpRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return context.json({ error: "Provide a challenge ID and a six-digit OTP." }, 400);

    const challenge = challenges.get(parsed.data.challengeId);
    if (!challenge) return context.json({ error: "OTP challenge not found." }, 404);
    if (challenge.used) return context.json({ error: "This OTP has already been used." }, 409);
    if (challenge.expiresAt <= now()) {
      return context.json({ error: "This OTP has expired. Request a new code." }, 410);
    }
    if (challenge.otp !== parsed.data.otp) return context.json({ error: "Incorrect OTP." }, 401);

    // Consume before issuing the session, with no await between the check and mutation.
    challenge.used = true;
    const previousSession = getCookie(context, SESSION_COOKIE);
    if (previousSession) sessions.delete(previousSession);
    const sessionId = randomBytes(32).toString("hex");
    sessions.set(sessionId, { email: challenge.email, expiresAt: now() + SESSION_LIFETIME_MS });
    setCookie(context, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "Strict",
      path: "/",
      maxAge: SESSION_LIFETIME_MS / 1000,
      // Loopback development uses HTTP; a deployed service would require HTTPS.
      secure: false,
    });
    return context.json(homeFor(challenge.email));
  });

  demo.post("/auth/logout", (context) => {
    const sessionId = getCookie(context, SESSION_COOKIE);
    if (sessionId) sessions.delete(sessionId);
    deleteCookie(context, SESSION_COOKIE, { path: "/" });
    return context.body(null, 204);
  });

  const requireSession: MiddlewareHandler<DemoEnv> = async (context, next) => {
    const sessionId = getCookie(context, SESSION_COOKIE);
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session || session.expiresAt <= now()) {
      if (sessionId) sessions.delete(sessionId);
      deleteCookie(context, SESSION_COOKIE, { path: "/" });
      return context.json({ error: "Authentication required." }, 401);
    }
    context.set("email", session.email);
    await next();
  };

  demo.use("/home", requireSession);
  demo.use("/tasks/*", requireSession);

  demo.get("/home", (context) => context.json(homeFor(context.get("email"))));

  demo.patch("/tasks/:taskId", async (context) => {
    const parsed = updateTaskRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return context.json({ error: "Provide a boolean completed value." }, 400);

    // Keep the stored tasks so PATCH changes survive the next home read.
    const home = homeFor(context.get("email"));
    const task = home.tasks.find((item) => item.id === context.req.param("taskId"));
    if (!task) return context.json({ error: "Task not found." }, 404);
    // An explicit value makes repeated requests safe; the server owns checklist state.
    task.completed = parsed.data.completed;
    return context.json(home);
  });

  if (testMode) {
    // No authentication bypass: these helpers only reset state or advance server time.
    demo.post("/__test/reset", (context) => {
      challenges.clear();
      sessions.clear();
      tasksByEmail.clear();
      testTime = TEST_START_TIME;
      return context.json({ reset: true });
    });
    demo.post("/__test/advance-time", async (context) => {
      const body: unknown = await context.req.json().catch(() => null);
      const milliseconds = typeof body === "object" && body !== null && "milliseconds" in body
        ? body.milliseconds : undefined;
      if (typeof milliseconds !== "number" || !Number.isSafeInteger(milliseconds)
        || milliseconds < 0 || milliseconds > 86400000) {
        return context.json({ error: "Provide milliseconds between 0 and 86400000." }, 400);
      }
      testTime += milliseconds;
      return context.json({ now: testTime });
    });
  }

  return demo;
}
