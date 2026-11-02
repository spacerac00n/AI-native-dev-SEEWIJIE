import {
  healthResponseSchema,
  homeResponseSchema,
  mockOtpSchema,
  otpChallengeSchema,
  type DemoHome,
  type MockOtp,
  type OtpChallenge,
} from "@veriqa/contracts";
import { StrictMode, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { api, ApiError } from "./api";
import "./style.css";

function App() {
  const [status, setStatus] = useState("API health has not been checked.");
  const [home, setHome] = useState<DemoHome | null>(null);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [delivery, setDelivery] = useState<MockOtp | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function showLogin() {
    setHome(null);
    setChallenge(null);
    setDelivery(null);
    setOtp("");
    window.history.replaceState(null, "", "/login");
  }

  useEffect(() => {
    let active = true;
    // A refresh always asks the server to recognize the cookie before showing data.
    api("/home", homeResponseSchema).then((result) => {
      if (!active) return;
      setHome(result);
      window.history.replaceState(null, "", "/home");
    }).catch((failure: unknown) => {
      if (!active) return;
      showLogin();
      if (!(failure instanceof ApiError && failure.status === 401)) {
        setError("Cannot reach the demo API. Please try refreshing.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Serialize forms and task changes so a double click cannot create overlapping writes.
  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
      if (home && failure instanceof ApiError && failure.status === 401) showLogin();
    } finally {
      setBusy(false);
    }
  }

  function requestOtp(event: FormEvent) {
    event.preventDefault();
    void runAction(async () => {
      const result = await api("/auth/request-otp", otpChallengeSchema, {
        method: "POST", body: JSON.stringify({ email }),
      });
      setChallenge(result);
      setOtp("");
      setDelivery(await api(`/mock-otp/${result.challengeId}`, mockOtpSchema));
    });
  }

  function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    void runAction(async () => {
      const result = await api("/auth/verify-otp", homeResponseSchema, {
        method: "POST", body: JSON.stringify({ challengeId: challenge.challengeId, otp }),
      });
      setHome(result);
      setChallenge(null);
      setDelivery(null);
      setOtp("");
      window.history.replaceState(null, "", "/home");
    });
  }

  function updateTask(id: string, completed: boolean) {
    if (!home) return;
    const previousHome = home;
    // Reflect the click immediately, then accept the server result or roll back on error.
    setHome({
      ...home,
      tasks: home.tasks.map((task) => task.id === id ? { ...task, completed } : task),
    });
    void runAction(async () => {
      try {
        setHome(await api(`/tasks/${id}`, homeResponseSchema, {
          method: "PATCH", body: JSON.stringify({ completed }),
        }));
      } catch (failure) {
        setHome(previousHome);
        throw failure;
      }
    });
  }

  function logout() {
    void runAction(async () => {
      const response = await fetch("/api/demo/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed. Please try again.");
      showLogin();
    });
  }

  async function checkHealth() {
    setStatus("Checking API...");
    try {
      const response = await fetch("/api/health");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // A reachable endpoint must also return the expected shared contract.
      const health = healthResponseSchema.parse(await response.json());
      setStatus(`API is healthy (${health.service}).`);
    } catch {
      setStatus("API health check failed. Check that the API is running.");
    }
  }

  return (
    <main className="demo-shell">
      <header className="brand-header"><span className="brand-symbol" aria-hidden="true">m</span><div><p className="wordmark">matcha</p><h1>VeriQA Demo</h1></div></header>
      <div className="welcome-layout">
        <div className="intro"><p className="eyebrow">A little hello goes a long way</p><p className="hero-title">Find your people.<br /><em>Feel at home.</em></p><p className="hero-description">Good conversations. Shared interests. A new friend around the corner.</p><div className="friend-art" aria-hidden="true"><span className="friend friend-one"><i /><b /></span><span className="friend friend-two"><i /><b /></span><span className="spark">✳</span></div><p className="intro-note">A fresh start, together.</p></div>
        <div className="auth-panel">
      {loading ? <p>Checking your session...</p> : home ? (
        <section className="home-screen">
          <p className="eyebrow">Make yourself at home</p>
          <h2>Welcome, {home.email}</h2>
          <h3>Your checklist</h3>
          <ul>
            {home.tasks.map((task) => (
              <li key={task.id}>
                <label>
                  <input type="checkbox" checked={task.completed} disabled={busy}
                    onChange={(event) => updateTask(task.id, event.currentTarget.checked)} />
                  {task.title}
                </label>
              </li>
            ))}
          </ul>
          <button type="button" onClick={logout} disabled={busy}>Logout</button>
        </section>
      ) : challenge ? (
        <section>
          <p className="eyebrow">One small step</p>
          <h2>Verify OTP</h2>
          <p>Enter the six-digit code for {email}. It expires after five minutes.</p>
          <aside className="mock-otp" aria-label="Local mock OTP delivery">
            {delivery && <p>Mock OTP: <output data-testid="mock-otp">{delivery.otp}</output></p>}
          </aside>
          <form onSubmit={verifyOtp}>
            <label>OTP <input name="otp" inputMode="numeric" autoComplete="one-time-code" disabled={busy}
              value={otp} onChange={(event) => setOtp(event.target.value)} required /></label>
            <button type="submit" disabled={busy}>Verify OTP</button>
          </form>
          <button type="button" disabled={busy} onClick={() => { showLogin(); setError(""); }}>
            Use a different email
          </button>
        </section>
      ) : (
        <section>
          <p className="eyebrow">Your next connection starts here</p>
          <h2>Email login</h2>
          <p>Use a synthetic email ending exactly with @e.ntu.edu.sg.</p>
          <form onSubmit={requestOtp}>
            <label>Email <input name="email" type="email" value={email} disabled={busy}
              onChange={(event) => setEmail(event.target.value)} required /></label>
            <button type="submit" disabled={busy}>Request OTP</button>
          </form>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
        </div>
      </div>
      <footer className="demo-footer"><span>Friend matching · local demo</span><div><button type="button" onClick={checkHealth}>Check API health</button><p role="status">{status}</p></div></footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
