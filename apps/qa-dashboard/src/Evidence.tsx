import { useRef, useState } from "react";
import type { CaseExecution, RunDetail } from "@veriqa/contracts";
import { artifactUrl, cleanLog, date, display, short } from "./api";

export function Badge({ value }: { value: string }) {
  const positive = ["passed", "approved", "validated"].includes(value);
  const negative = ["failed", "assertion-failed", "execution-error", "rejected"].includes(value);
  return <span className={`badge ${positive ? "positive" : negative ? "negative" : "neutral"}`}>
    <span aria-hidden="true">{positive ? "✓" : negative ? "!" : "•"}</span> {value.replaceAll("-", " ")}
  </span>;
}

export function Logs({ runId, paths }: { runId: string; paths: string[] }) {
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState("");
  const latestRequest = useRef(0);
  async function open(path: string) {
    const token = ++latestRequest.current;
    setSelected(path);
    setContent("Loading log…");
    try {
      const response = await fetch(artifactUrl(runId, path));
      if (!response.ok) throw new Error(`Evidence unavailable (HTTP ${response.status})`);
      const text = await response.text();
      if (token === latestRequest.current) setContent(cleanLog(text.slice(0, 100_000))
        + (text.length > 100_000 ? "\n… Preview truncated; download the original for all output." : ""));
    } catch (error) { if (token === latestRequest.current) setContent(error instanceof Error ? error.message : "Cannot read evidence"); }
  }
  return <div className="logs">
    <div className="inline-links">{paths.map((path) => <button type="button" className="text-button" key={path}
      onClick={() => void open(path)}>{path.split("/").at(-1)}</button>)}</div>
    {selected && <div className="log-content"><div className="between"><code>{selected}</code>
      <a href={artifactUrl(runId, selected)} target="_blank" rel="noreferrer">Open original ↗</a></div><pre>{content}</pre></div>}
  </div>;
}

export function CaseEvidence({ item, runId }: { item: CaseExecution; runId: string }) {
  const screenshots = item.artifacts.filter((path) => path.endsWith(".png"));
  const traces = item.artifacts.filter((path) => path.endsWith("trace.zip"));
  return <div className="case-evidence">
    {screenshots.length > 0 ? screenshots.map((path) => <a className="screenshot" key={path} href={artifactUrl(runId, path)} target="_blank" rel="noreferrer">
      <img src={artifactUrl(runId, path)} alt={`Real browser output for ${item.caseId}`} loading="lazy" />
      <span>Browser screenshot · open original ↗</span></a>) : <p className="muted small">No screenshot captured for this case.</p>}
    {traces.map((path) => <a className="trace-link" key={path} href={artifactUrl(runId, path)}>↓ Download Playwright trace</a>)}
    {traces.length > 0 && <p className="muted small">Open the downloaded ZIP with Playwright Trace Viewer.</p>}
    {item.errors.length > 0 && <pre className="failure-output">{cleanLog(item.errors.join("\n\n"))}</pre>}
  </div>;
}

export function RunInspection({ detail }: { detail: RunDetail }) {
  const { summary, record } = detail;
  return <section className="panel run-inspection" aria-label="Run details">
    <div className="between"><div><p className="eyebrow">Execution evidence</p><h2>Run inspection</h2></div><Badge value={summary.outcome} /></div>
    <dl className="metadata"><div><dt>Run ID</dt><dd><code>{summary.runId}</code></dd></div>
      <div><dt>Started</dt><dd>{date(summary.startedAt)}</dd></div>
      <div><dt>Git SHA</dt><dd><code>{summary.testedCommit ?? "Unavailable"}</code> {summary.worktreeDirty === null ? "" : summary.worktreeDirty ? "· dirty worktree" : "· clean worktree"}</dd></div>
      <div><dt>Plan / revision</dt><dd><code>{summary.planId ?? "Unknown"} / {summary.revision ?? "Unknown"}</code></dd></div></dl>
    {summary.error && <pre className="failure-output">{cleanLog(summary.error)}</pre>}
    {!record && <div className="notice">{summary.outcome === "running" ? "Playwright is executing. Results appear after the run is finalized."
      : "No verified completed result is available. This attempt is not a passing run."}</div>}
    {record && <>
      <div className="result-counts"><span><strong>{record.metadata.counts.passed}</strong> passed</span>
        <span><strong>{record.metadata.counts.failed}</strong> failed / errors</span><span><strong>{record.metadata.counts.skipped}</strong> skipped</span>
        <span><strong>{(record.durationMs / 1000).toFixed(1)}s</strong> duration</span></div>
      <p className="small muted">Real Playwright execution · saved-plan replay · {record.metadata.planSource === "live-ai" ? "AI-generated plan" : "Manually authored fixture"} · mock OTP delivery only</p>
      <details className="provenance"><summary>Approval, provenance & command</summary><dl className="metadata">
        <div><dt>Approval</dt><dd>{record.approval.approvedBy} · {date(record.approval.approvedAt)}<br /><code>{record.approval.approvalId}</code></dd></div>
        <div><dt>Content hash</dt><dd><code>{record.metadata.contentHash}</code></dd></div>
        <div><dt>Model / response</dt><dd>{record.plan.plan.provenance?.model ?? "No model · manual fixture"}<br /><code>{record.plan.plan.provenance?.responseId ?? "—"}</code></dd></div>
        <div><dt>Command / exit</dt><dd><code>{record.metadata.command}</code><br />Exit code: {record.metadata.exitCode}</dd></div></dl></details>
      <div className="case-list">{record.cases.map((item) => <details key={item.caseId} className="case-result" open={item.status !== "passed"}>
        <summary><span><code>{item.caseId}</code> {item.title}</span><Badge value={item.status} /></summary>
        <div className="case-body"><p className="small muted">{item.requirementIds.join(", ")} · {(item.durationMs / 1000).toFixed(2)}s · phase: {item.phase}</p>
          <div className="table-scroll"><table className="assertions"><thead><tr><th>Assertion</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead>
            <tbody>{record.plan.plan.cases.find((entry) => entry.id === item.caseId)?.assertions.map((definition, index) => {
              const observed = item.assertions.find((entry) => entry.index === index);
              return <tr key={index}><td><code>{definition.type}</code><details><summary>Definition</summary><pre>{display(definition)}</pre></details></td>
                <td><pre>{display(observed?.expected ?? definition)}</pre></td><td><pre>{observed ? display(observed.actual) : "Not executed"}</pre></td>
                <td><Badge value={observed?.status ?? "not executed"} /></td></tr>;
            })}</tbody></table></div>
          <CaseEvidence item={item} runId={summary.runId} />
          <Logs key={`${summary.runId}/${item.caseId}`} runId={summary.runId} paths={item.artifacts.filter((path) => path.endsWith(".log.json") || path.endsWith("result.json"))} />
        </div></details>)}</div>
    </>}
    <div className="raw-logs"><h3>Raw execution output</h3><Logs key={summary.runId} runId={summary.runId}
      paths={detail.artifacts.filter((path) => ["stdout.log", "stderr.log", "command.json", "attempt.json", "rejection.json"].includes(path))} />
      {record && <a className="small" href={artifactUrl(summary.runId, "run.json")} target="_blank" rel="noreferrer">Open structured run JSON ↗</a>}</div>
  </section>;
}

export function Comparison({ left, right }: { left: RunDetail; right: RunDetail }) {
  const ids = [...new Set([...(left.record?.cases.map((item) => item.caseId) ?? []), ...(right.record?.cases.map((item) => item.caseId) ?? [])])];
  return <div className="comparison">
    <div className="compare-grid">{[left, right].map((detail, index) => <div className="panel compare-heading" key={index}>
      <p className="eyebrow">{index === 0 ? "Before · selected run" : "After · selected run"}</p><Badge value={detail.summary.outcome} />
      <p><code>{detail.summary.runId}</code></p><p className="small muted">{date(detail.summary.startedAt)}<br />Git {short(detail.summary.testedCommit)} · {detail.summary.worktreeDirty === null ? "unknown worktree state" : detail.summary.worktreeDirty ? "dirty" : "clean"}</p>
      <p className="small">{detail.summary.planId} / {short(detail.summary.revision)}</p>
      {!detail.record && <p className="notice">No finalized verified result.</p>}
    </div>)}</div>
    {ids.map((id) => {
      const a = left.record?.cases.find((item) => item.caseId === id);
      const b = right.record?.cases.find((item) => item.caseId === id);
      const count = Math.max(a?.assertions.length ?? 0, b?.assertions.length ?? 0);
      return <section className="panel comparison-case" key={id}><div className="between"><h3>{id}</h3>
        <span className="small muted">Matched by case ID</span></div><p>{a?.title ?? b?.title}</p>
        <div className="compare-grid">{[a, b].map((item, index) => <div key={index} className="compare-case-side">
          {item ? <><Badge value={item.status} /><CaseEvidence item={item} runId={index === 0 ? left.summary.runId : right.summary.runId} /></>
            : <p className="notice">Case not present in this run.</p>}</div>)}</div>
        <div className="table-scroll"><table className="assertions"><thead><tr><th>Check</th><th>Before: expected / actual</th><th>After: expected / actual</th><th>Difference</th></tr></thead>
          <tbody>{Array.from({ length: count }, (_, index) => {
            const before = a?.assertions.find((item) => item.index === index);
            const after = b?.assertions.find((item) => item.index === index);
            const changedExpected = display(before?.expected) !== display(after?.expected);
            const changedActual = display(before?.actual) !== display(after?.actual);
            const changedDefinition = display(before?.definition) !== display(after?.definition);
            const changedStatus = before?.status !== after?.status;
            return <tr key={index}><td>{index + 1} · {before?.definition.type ?? after?.definition.type}
              {before && after && before.definition.type !== after.definition.type ? ` → ${after.definition.type}` : ""}</td>
              {[before, after].map((value, side) => <td key={side}>{value ? <><span className="small muted">Expected</span><pre>{display(value.expected)}</pre>
                <span className="small muted">Actual</span><pre>{display(value.actual)}</pre><Badge value={value.status} /></> : "Not executed / absent"}</td>)}
              <td><span className={changedExpected || changedActual || changedDefinition || changedStatus ? "difference" : "muted"}>
                {changedExpected ? "Expectation changed" : changedDefinition ? "Definition changed" : changedActual ? "Actual changed" : changedStatus ? "Status changed" : "No value change"}</span></td></tr>;
          })}</tbody></table></div>
      </section>;
    })}
  </div>;
}
