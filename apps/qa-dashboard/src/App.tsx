import { healthResponseSchema, planInspectionSchema, planListSchema, qaStatusSchema, revisionSchema,
  runDetailSchema, runListSchema, type PlanInspection, type RunDetail, type RunSummary } from "@veriqa/contracts";
import { useCallback, useEffect, useState } from "react";
import { comparable, date, display, request, short } from "./api";
import { Badge, Comparison, RunInspection } from "./Evidence";

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
      setSelected(plan); await refresh(); setNotice("Human approval recorded for this exact revision and content hash.");
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
    <div className="workspace"><header className="topbar"><div className="health-control">
      <button className="text-button" type="button" onClick={() => void checkHealth()}>Check API health</button><span role="status">{health}</span></div></header>
      <main><div className="page-heading"><div><h1>VeriQA Dashboard</h1>
        </div><span className="environment-tag"><span className="live-dot" /> Local · synthetic data</span></div>
      {error && <div className="banner error" role="alert"><strong>Action needs attention</strong><span>{error}</span></div>}
      {notice && <div className="banner success"><strong>{notice}</strong></div>}
      {busy && <div className="banner progress" aria-live="polite"><span className="spinner" />{busy}</div>}
      {planErrors.map((message) => <div className="banner error" key={message}>{message}</div>)}
      {tab === "workflow" && <>
        <table className="stage-table" aria-label="Workflow stages"><thead><tr><th>Source</th><th>Validation</th><th>Approval</th><th>Execution</th></tr></thead>
          <tbody><tr><td>{selected?.plan.source === "live-ai" ? "AI generated" : selected ? "Manual fixture" : "—"}</td><td>{selected ? "Validated" : "—"}</td>
          <td>{selected?.status ?? "Required"}</td><td>{latest?.outcome.replaceAll("-", " ") ?? "Not executed"}</td></tr></tbody></table>
        <div className="workflow-grid"><div className="planning-column"><section className="panel composer"><details className="requirements-box"><summary>Requirements · generate a plan</summary>
          <label className="field-label" htmlFor="requirements">Application requirements</label><textarea id="requirements" value={requirements} onChange={(event) => setRequirements(event.target.value)} rows={4} maxLength={20000} />

          <button className="button primary" type="button" disabled={!!busy || !requirements.trim()} onClick={() => void generate()}>Generate test plan <span>↗</span></button>
          <small className="muted">Live OpenAI · synthetic data only</small></details>
          <label className="field-label" htmlFor="saved-plan">Or load a saved revision</label>
          <select id="saved-plan" value={selected?.revision ?? ""} disabled={!!busy} onChange={(event) => selectPlan(event.target.value)}>
            {plans.length === 0 && <option value="">No saved plans yet</option>}{plans.map((plan) => <option key={plan.revision} value={plan.revision}>{plan.plan.id} · {short(plan.revision)} · {plan.status} · {plan.plan.source}</option>)}
          </select><button className="text-button refresh" type="button" onClick={() => void action("Refreshing…", refresh)} disabled={!!busy}>↻ Refresh</button>
        </section>
{selected && <section className="panel plan-review"><div className="between"><strong>{selected.plan.title}</strong><span className="small muted">{selected.plan.cases.length} cases</span></div>
          <details className="provenance"><summary>Revision & content hash</summary><code>{selected.revision}<br />{selected.contentHash}</code></details>
          <details className="provenance"><summary>Requirements, AI provenance & review notes</summary>
            <ol>{selected.plan.requirements.map((item) => <li key={item.id}><code>{item.id}</code> {item.text}</li>)}</ol>
            {selected.plan.provenance ? <><dl className="metadata"><div><dt>Origin</dt><dd>Live OpenAI · {selected.plan.provenance.model}</dd></div>
              <div><dt>Generated</dt><dd>{date(selected.plan.provenance.generatedAt)}</dd></div><div><dt>Response ID</dt><dd><code>{selected.plan.provenance.responseId}</code></dd></div>
              <div><dt>Request ID / prompt</dt><dd><code>{selected.plan.provenance.requestId ?? "Unavailable"}</code> · {selected.plan.provenance.promptVersion}</dd></div></dl>
              <h3>Review notes</h3>
              {selected.plan.provenance.reviewNotes.length ? <ul>{selected.plan.provenance.reviewNotes.map((note, index) => <li key={index}>{note}</li>)}</ul> : <p className="muted">No review notes supplied.</p>}
              <details><summary>Original requirements & token usage</summary><pre>{selected.plan.provenance.requirementsText}</pre><pre>{display(selected.plan.provenance.usage)}</pre></details></>
              : <p className="notice">Manually authored fixture. No AI-generation provenance.</p>}</details>
          <div className="case-list">{selected.plan.cases.map((item, index) => <details className="proposed-case" key={item.id}>
            <summary><span className="case-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.id} · {item.requirementIds.join(", ")}</small></span><span className="muted small">{item.assertions.length} checks</span></summary>
            <div className="case-body"><table><thead><tr><th>Actions</th><th>Expected results</th></tr></thead><tbody><tr>
              <td>{item.actions.map((action, actionIndex) => <pre key={actionIndex}>{JSON.stringify(action)}</pre>)}</td>
              <td>{item.assertions.map((assertion, assertionIndex) => <pre key={assertionIndex}>{JSON.stringify(assertion)}</pre>)}</td>
            </tr></tbody></table></div>
          </details>)}</div>
        </section>}</div>
<section className="panel review-control">
          {selected ? <><div className="between"><strong>{selected.plan.id}</strong><Badge value={selected.status} /></div>
            <p className="small muted" title={selected.revision}>Revision <code>{short(selected.revision)}</code></p>
            {selected.approval && <div className="approval-receipt"><strong>Approved by {selected.approval.approvedBy}</strong><details><summary>Approval reference</summary><span>{date(selected.approval.approvedAt)}</span><code>{selected.approval.approvalId}</code></details></div>}
            {!approved && selected.status !== "superseded" && <><label className="field-label" htmlFor="reviewer">Reviewer name</label><input id="reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value)} maxLength={100} />
              <label className="checkbox-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I reviewed the actions and expected results for this exact revision.</label>
              <button className="button secondary" type="button" disabled={!!busy || !reviewer.trim() || !confirmed} onClick={() => void approve()}>Approve exact revision</button></>}
            {selected.status === "superseded" && <div className="notice">A newer revision exists. Select and review the current revision before execution.</div>}
            <div className="divider" /><label className="checkbox-line"><input type="checkbox" checked={captureScreenshots} onChange={(event) => setCaptureScreenshots(event.target.checked)} />Capture successful-case screenshots</label>
            <button className="button primary" type="button" disabled={!approved || !!busy || !!active || !enabled} onClick={() => void execute()}>{active ? "Playwright is running…" : "Execute approved plan"}<span>→</span></button>
            <small className="muted">Real Playwright replay · mock OTP</small>
            {!enabled && <div className="notice">Execution needs an isolated synthetic target. Start <code>npm run dev:qa</code>.</div>}
            {latest && <button type="button" className="text-button" onClick={() => inspectRun(latest.runId)}>Inspect latest run · {short(latest.runId)} ↗</button>}
          </> : <p className="empty">Generate or load a plan to begin review.</p>}
        </section></div>
      </>}
      {tab === "history" && <>
        {detail && <RunInspection detail={detail} />}
        <section className="panel history"><div className="between"><div><h2>Run history</h2></div><div className="inline-links">
          <button className="text-button" type="button" onClick={() => void action("Refreshing…", refresh)}>↻ Refresh</button><button className="button secondary compact" type="button" disabled={!beforeId || !afterId} onClick={() => setTab("compare")}>Compare selected (2)</button></div></div>
          <div className="table-scroll"><table><thead><tr><th>Compare</th><th>Run / plan</th><th>Outcome</th><th>Passed / failed / skipped</th><th>Git SHA</th><th>Started</th></tr></thead>
            <tbody>{runs.map((run) => <tr key={run.runId} className={selectedRun === run.runId ? "selected-row" : ""}><td><input type="checkbox" aria-label={`Compare run ${run.runId}`} checked={beforeId === run.runId || afterId === run.runId} onChange={() => chooseComparison(run.runId)} /></td>
              <td><button type="button" className="text-button run-link" onClick={() => inspectRun(run.runId)}>{short(run.runId)}</button><small>{run.planId ?? "Unknown plan"} · {short(run.revision)}</small></td>
              <td><Badge value={run.outcome} /></td><td>{run.counts ? `${run.counts.passed} / ${run.counts.failed} / ${run.counts.skipped}` : "Not finalized"}</td>
              <td><code title={run.testedCommit ?? ""}>{short(run.testedCommit)}</code><small>{run.worktreeDirty === null ? "Unknown state" : run.worktreeDirty ? "dirty" : "clean"}</small></td><td className="small">{date(run.startedAt)}</td></tr>)}</tbody></table></div>
          {runs.length === 0 && <p className="empty">No executions yet. Approve a plan, then run it to collect evidence.</p>}
        </section>{!detail && <div className="empty panel">Select a run to inspect individual cases and evidence.</div>}
      </>}
      {tab === "compare" && <>
        <section className="panel"><h2>Compare runs</h2>

          <div className="compare-grid"><label className="field-label">Before run<select aria-label="Before run" value={beforeId} onChange={(event) => setBeforeId(event.target.value)}><option value="">Choose a run</option>{runs.map((run) => <option key={run.runId} value={run.runId}>{short(run.runId)} · {run.planId} · {run.outcome}</option>)}</select></label>
            <label className="field-label">After run<select aria-label="After run" value={afterId} onChange={(event) => setAfterId(event.target.value)}><option value="">Choose a run</option>{runs.filter((run) => run.runId !== beforeId).map((run) => <option key={run.runId} value={run.runId}>{short(run.runId)} · {run.planId} · {run.outcome}</option>)}</select></label></div>
          {before && after && <div className="notice">{before.summary.runId === after.summary.runId ? "Select two distinct runs."
            : comparable(before, after) ? "Same plan, revision and content hash. Case expectations are directly comparable."
              : "Different plans/revisions or incomplete evidence. Expectations may differ; case IDs alone do not establish equivalent coverage."}</div>}
        </section>{before && after && before.summary.runId !== after.summary.runId && <Comparison left={before} right={after} />}
      </>}

      </main>
    </div>
  </div>;
}
