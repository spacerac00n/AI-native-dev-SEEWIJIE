import { healthResponseSchema } from "@veriqa/contracts";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [status, setStatus] = useState("API health has not been checked.");

  async function checkHealth() {
    setStatus("Checking API...");
    try {
      const response = await fetch("/api/health");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Reuse the contract instead of trusting an unchecked JSON response.
      const health = healthResponseSchema.parse(await response.json());
      setStatus(`API is healthy (${health.service}).`);
    } catch {
      setStatus("API health check failed. Check that the API is running.");
    }
  }

  return (
    <main>
      <h1>VeriQA Dashboard</h1>
      <p>QA dashboard shell.</p>
      <button type="button" onClick={checkHealth}>Check API health</button>
      <p role="status">{status}</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
