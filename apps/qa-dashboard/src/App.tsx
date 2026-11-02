import { healthResponseSchema, planInspectionSchema, planListSchema, qaStatusSchema, revisionSchema,
  runDetailSchema, runListSchema, type PlanInspection, type RunDetail, type RunSummary } from "@veriqa/contracts";
import { useCallback, useEffect, useState } from "react";
import { comparable, date, display, request } from "./api";
import { actionDescription, expectation, planOptionLabel, runLabel } from "./presentation";
import { Badge, Comparison, RunInspection, TechnicalDetails } from "./Evidence";

const initialRequirements = `Using synthetic accounts only, verify passwordless login with an exact @e.ntu.edu.sg email and a correct mock OTP.
Reject other email domains. Unauthenticated users cannot access protected home data.
Verify the welcome message, checklist persistence after refresh, and logout invalidating the server session.
Propose up to three focused cases supported by the demo.`;

type Tab = "workflow" | "history" | "compare";
export default function App() {
  const [tab, setTab] = useState<Tab>("workflow");
  const [plans, setPlans] = useState<PlanInspection[]>([]);
  const [selected, setSelected] = useState<PlanInspection | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState("");
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [requirements, setRequirements] = useState(initialRequirements);
  const [reviewer, setReviewer] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [captureScreenshots, setCaptureScreenshots] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [planErrors, setPlanErrors] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [health, setHealth] = useState("API health has not been checked.");
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const [before, setBefore] = useState<RunDetail | null>(null);
  const [after, setAfter] = useState<RunDetail | null>(null);

  const refresh = useCallback(async () => {
    const [saved, history, status] = await Promise.all([
      request("/plans", planListSchema), request("/runs", runListSchema), request("/status", qaStatusSchema),
    ]);
    setPlans(saved.plans); setPlanErrors(saved.errors); setRuns(history.runs);
    setEnabled(status.executionEnabled); setActive(status.activeRunId);
    setSelected((previous) => previous ? saved.plans.find((item) => item.revision === previous.revision) ?? previous
      : saved.plans.find((item) => item.status === "approved" && item.plan.source === "live-ai") ?? saved.plans[0] ?? null);
  }, []);
  useEffect(() => { void refresh().catch((failure: Error) => setError(failure.message)); }, [refresh]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => { void refresh().catch((failure: Error) => setError(failure.message)); }, 1500);
    return () => window.clearInterval(timer);
  }, [active, refresh]);
  useEffect(() => {
    if (!selectedRun) { setDetail(null); return; }
    let cancelled = false;
    void request(`/runs/${selectedRun}`, runDetailSchema).then((value) => { if (!cancelled) setDetail(value); })
      .catch((failure: Error) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [selectedRun, runs]);
  useEffect(() => {
    let cancelled = false;
    setBefore(null); setAfter(null);
    if (beforeId && afterId) void Promise.all([request(`/runs/${beforeId}`, runDetailSchema), request(`/runs/${afterId}`, runDetailSchema)])
      .then(([left, right]) => { if (!cancelled) { setBefore(left); setAfter(right); } })
      .catch((failure: Error) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [beforeId, afterId, runs]);

  async function action(label: string, operation: () => Promise<void>) {
    setBusy(label); setError(""); setNotice("");
    try { await operation(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Action failed"); }
    finally { setBusy(""); }
  }
  async function generate() {
    await action("Generating with OpenAI…", async () => {
      const plan = await request("/plans/generate", planInspectionSchema, { requirements });
      await refresh(); setSelected(plan); setConfirmed(false); setReviewer("");
      setNotice("New AI plan saved and validated. Review the cases and expectations before approving.");
    });
  }
  async function approve() {
    if (!selected) return;
    await action("Recording approval…", async () => {
      const plan = await request("/plans/approve", planInspectionSchema, { planId: selected.plan.id, revision: selected.revision,
        contentHash: selected.contentHash, approvedBy: reviewer, confirm: confirmed });
      setSelected(plan); await refresh(); setNotice("Test plan approved. Ready to execute.");
    });
  }
  async function execute() {
    if (!selected) return;
    await action("Starting Playwright…", async () => {
      const accepted = await request("/runs", { parse(value: unknown) {
        if (!value || typeof value !== "object" || !("runId" in value)) throw new Error("Missing run ID");
        return { runId: revisionSchema.parse(value.runId) };
      } }, { planId: selected.plan.id, revision: selected.revision, contentHash: selected.contentHash, captureScreenshots });
      setActive(accepted.runId); setDetail(null); setSelectedRun(accepted.runId); setTab("history"); await refresh();
    });
  }
  async function checkHealth() {
    setHealth("Checking API…");
    try { const response = await fetch("/api/health"); if (!response.ok) throw new Error("Unavailable");
      const value = healthResponseSchema.parse(await response.json()); setHealth(`API is healthy (${value.service}).`);
    } catch { setHealth("API health check failed. Check that the API is running."); }
  }
  const approved = selected?.status === "approved";
  const latest = runs.find((item) => item.planId === selected?.plan.id && item.revision === selected?.revision);
  function selectPlan(revision: string) {
    setSelected(plans.find((item) => item.revision === revision) ?? null); setConfirmed(false); setReviewer(""); setNotice("");
  }
  function inspectRun(runId: string) {
    if (runId !== selectedRun) { setDetail(null); setSelectedRun(runId); }
    setTab("history");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function chooseComparison(runId: string) {
    if (beforeId === runId) setBeforeId(""); else if (afterId === runId) setAfterId("");
    else if (!beforeId) setBeforeId(runId); else setAfterId(runId);
  }

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={() => setTab("workflow")}><span className="brand-mark">V</span><span>VeriQA</span></a>
      <nav aria-label="Workspace">
        {([["workflow", "01", "Plan & execute"], ["history", "02", "Run history"], ["compare", "03", "Compare runs"]] as const).map(([value, number, label]) =>
          <button key={value} type="button" className={tab === value ? "nav-item selected" : "nav-item"} aria-current={tab === value ? "page" : undefined}
            onClick={() => setTab(value)}><span>{number}</span>{label}{value === "history" && <small>{runs.length}</small>}</button>)}
      </nav>
      <a className="demo-link" href="http://127.0.0.1:5173" target="_blank" rel="noreferrer">Open demo application ↗</a>
    </aside>
    <div className="workspace"><header className="topbar"><details className="service-details"><summary>Technical details</summary><div className="health-control">
      <button className="text-button" type="button" onClick={() => void checkHealth()}>Check API health</button><span role="status">{health}</span></div></details></header>
      <main><div className="page-heading"><div><h1>VeriQA Dashboard</h1>
        </div><span className="environment-tag"><span className="live-dot" /> Local · synthetic data</span></div>
      {error && <div className="banner error" role="alert"><strong>The action could not finish.</strong><span>Review the diagnostic information before trying again.</span><TechnicalDetails><pre>{error}</pre></TechnicalDetails></div>}
      {notice && <div className="banner success"><strong>{notice}</strong></div>}
      {busy && <div className="banner progress" aria-live="polite"><span className="spinner" />{busy}</div>}
      {planErrors.length > 0 && <div className="banner error">Some saved plans could not be loaded.<TechnicalDetails>{planErrors.map(message => <pre key={message}>{message}</pre>)}</TechnicalDetails></div>}
      {tab === "workflow" && <>
        <div className="workflow-overview"><span>{selected?.plan.source === "live-ai" ? "AI-generated test plan" : "Test plan"}</span><Badge value={selected?.status ?? "Review required"} />{latest && <button className="text-button" onClick={() => inspectRun(latest.runId)}>Latest results: {latest.counts ? `${latest.counts.passed} passed · ${latest.counts.failed} failed / errors` : latest.outcome.replaceAll("-", " ")} →</button>}</div>
        <div className="workflow-grid"><div className="planning-column"><section className="panel composer"><details className="requirements-box"><summary>Requirements · generate a plan</summary>
          <label className="field-label" htmlFor="requirements">Application requirements</label><textarea id="requirements" value={requirements} onChange={(event) => setRequirements(event.target.value)} rows={4} maxLength={20000} />

          <button className="button primary" type="button" disabled={!!busy || !requirements.trim()} onClick={() => void generate()}>Generate test plan <span>↗</span></button>
          <small className="muted">Live OpenAI · synthetic data only</small></details>
          <label className="field-label" htmlFor="saved-plan">Or load a saved revision</label>
          <select id="saved-plan" value={selected?.revision ?? ""} disabled={!!busy} onChange={(event) => selectPlan(event.target.value)}>
            {plans.length === 0 && <option value="">No saved plans yet</option>}{plans.map((plan) => <option key={plan.revision} value={plan.revision}>{planOptionLabel(plan)}</option>)}
          </select><button className="text-button refresh" type="button" onClick={() => void action("Refreshing…", refresh)} disabled={!!busy}>↻ Refresh</button>
        </section>
{selected && <section className="panel plan-review"><h2>Test Plan Review</h2><div className="between"><strong>{selected.plan.title}</strong><span className="small muted">{selected.plan.cases.length} cases</span></div>
          <TechnicalDetails><p>Plan: {selected.plan.id}</p><code>{selected.revision}<br />{selected.contentHash}</code><pre>{display(selected.plan.provenance)}</pre></TechnicalDetails>
          <details className="provenance"><summary>Requirements & review notes</summary>
            <ol>{selected.plan.requirements.map((item) => <li key={item.id}>{item.text}</li>)}</ol>
            {selected.plan.provenance ? <ul>{selected.plan.provenance.reviewNotes.map((note, index) => <li key={index}>{note}</li>)}</ul> : <p className="muted">Manually authored fixture.</p>}</details>
          <div className="case-list">{selected.plan.cases.map((item, index) => <details className="proposed-case" key={item.id}>
            <summary><span className="case-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong></span><span className="muted small">{item.assertions.length} checks</span></summary>
            <div className="case-body"><div className="proposed-grid"><div><strong>Steps</strong><ol>{item.actions.map((value, i) => <li key={i}>{actionDescription(value)}</li>)}</ol></div><div><strong>Expected behavior</strong><ul>{item.assertions.map((value, i) => <li key={i}>{expectation(value)}</li>)}</ul></div></div><TechnicalDetails><pre>{display(item)}</pre></TechnicalDetails></div>
          </details>)}</div>
        </section>}</div>
<section className="panel review-control">
          {selected ? <><div className="between"><strong>Review & execute</strong><Badge value={selected.status} /></div>

            {selected.approval && <div className="approval-receipt"><strong>Approved by {selected.approval.approvedBy}</strong><details><summary>Technical details</summary><span>{date(selected.approval.approvedAt)}</span><code>{selected.approval.approvalId}</code></details></div>}
            {!approved && selected.status !== "superseded" && <><label className="field-label" htmlFor="reviewer">Reviewer name</label><input id="reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value)} maxLength={100} />
              <label className="checkbox-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I reviewed the actions and expected results for this exact revision.</label>
              <button className="button secondary" type="button" disabled={!!busy || !reviewer.trim() || !confirmed} onClick={() => void approve()}>Approve exact revision</button></>}
            {selected.status === "superseded" && <div className="notice">A newer revision exists. Select and review the current revision before execution.</div>}
            <div className="divider" /><label className="checkbox-line"><input type="checkbox" checked={captureScreenshots} onChange={(event) => setCaptureScreenshots(event.target.checked)} />Capture successful-case screenshots</label>
            <button className="button primary" type="button" disabled={!approved || !!busy || !!active || !enabled} onClick={() => void execute()}>{active ? "Playwright is running…" : "Execute approved plan"}<span>→</span></button>
            <small className="muted">Real Playwright replay · mock OTP</small>
            {!enabled && <div className="notice">Execution needs an isolated synthetic target. Start <code>npm run dev:qa</code>.</div>}
            {latest && <button type="button" className="text-button" onClick={() => inspectRun(latest.runId)}>View latest results ↗</button>}
          </> : <p className="empty">Generate or load a plan to begin review.</p>}
        </section></div>
      </>}
      {tab === "history" && <>
        {detail && <RunInspection detail={detail} />}
        <section className="panel history"><div className="between"><div><h2>Run history</h2></div><div className="inline-links">
          <button className="text-button" type="button" onClick={() => void action("Refreshing…", refresh)}>↻ Refresh</button><button className="button secondary compact" type="button" disabled={!beforeId || !afterId} onClick={() => setTab("compare")}>Compare selected (2)</button></div></div>
          <div className="history-list">{runs.map((run, index) => <div key={run.runId} className={selectedRun === run.runId ? "history-row selected-row" : "history-row"}>
            <input type="checkbox" aria-label={`Compare ${runLabel(run, runs.length - index)}`} checked={beforeId === run.runId || afterId === run.runId} onChange={() => chooseComparison(run.runId)} />
            <div><button type="button" className="text-button" onClick={() => inspectRun(run.runId)}>{plans.find(p => p.plan.id === run.planId && p.revision === run.revision)?.plan.title ?? (run.planSource === "manual-fixture" ? "Saved fixture test plan" : "Saved test plan")}</button><p className="small muted">{runLabel(run, runs.length - index)}</p><TechnicalDetails><pre>{display(run)}</pre></TechnicalDetails></div>
            <div><Badge value={run.outcome} /><p className="small muted">{run.counts ? `${run.counts.passed} passed · ${run.counts.failed} failed / errors · ${run.counts.skipped} skipped` : "Not finalized"}</p></div>
          </div>)}</div>
          {runs.length === 0 && <p className="empty">No executions yet. Approve a plan, then run it to collect evidence.</p>}
        </section>{!detail && <div className="empty panel">Select a run to inspect individual cases and evidence.</div>}
      </>}
      {tab === "compare" && <>
        <section className="panel"><h2>Compare runs</h2>

          <div className="compare-grid"><label className="field-label">Before run<select aria-label="Before run" value={beforeId} onChange={(event) => setBeforeId(event.target.value)}><option value="">Choose a run</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{runLabel(run)} · {run.outcome.replaceAll("-", " ")}</option>)}</select></label>
            <label className="field-label">After run<select aria-label="After run" value={afterId} onChange={(event) => setAfterId(event.target.value)}><option value="">Choose a run</option>{runs.filter((run) => run.runId !== beforeId).map((run) => <option key={run.runId} value={run.runId}>{runLabel(run)} · {run.outcome.replaceAll("-", " ")}</option>)}</select></label></div>
          {before && after && <div className="notice">{before.summary.runId === after.summary.runId ? "Select two distinct runs."
            : comparable(before, after) ? "Same test expectations. Results are directly comparable."
              : "Different test expectations or incomplete results. Review the checks before drawing conclusions."}</div>}
        </section>{before && after && before.summary.runId !== after.summary.runId && <Comparison left={before} right={after} />}
      </>}

      </main>
    </div>
  </div>;
}
