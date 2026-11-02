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
      <span>Screenshot ↗</span></a>) : <p className="muted small">No screenshot captured for this case.</p>}
    {traces.map((path) => <a className="trace-link" key={path} href={artifactUrl(runId, path)}>↓ Download Playwright trace</a>)}
    {traces.length > 0 && <p className="muted small">Open ZIP in Playwright Trace Viewer.</p>}
    {item.errors.length > 0 && <pre className="failure-output">{cleanLog(item.errors.join("\n\n"))}</pre>}
  </div>;
}

export function RunInspection({ detail }: { detail: RunDetail }) {
  const { summary, record } = detail;
  return <section className="panel run-inspection" aria-label="Run details">
    <div className="between"><h2>Run inspection</h2><Badge value={summary.outcome} /></div>
    <table className="compact-metadata"><tbody>
      <tr><th>Run ID</th><td><code>{summary.runId}</code></td><th>Started</th><td>{date(summary.startedAt)}</td></tr>
      <tr><th>Git SHA</th><td><code title={summary.testedCommit ?? ""}>{short(summary.testedCommit)}</code> · {summary.worktreeDirty === null ? "unknown" : summary.worktreeDirty ? "dirty" : "clean"}</td>
      <th>Plan / revision</th><td><code title={summary.revision ?? ""}>{summary.planId ?? "—"} / {short(summary.revision)}</code></td></tr>
    </tbody></table>
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
      <div className="case-list">{record.cases.map((item) => <details key={item.caseId} className="case-result" >
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
    <details className="raw-logs"><summary>Raw execution output</summary><Logs key={summary.runId} runId={summary.runId}
      paths={detail.artifacts.filter((path) => ["stdout.log", "stderr.log", "command.json", "attempt.json", "rejection.json"].includes(path))} />
      {record && <a className="small" href={artifactUrl(summary.runId, "run.json")} target="_blank" rel="noreferrer">Open structured run JSON ↗</a>}</details>
  </section>;
}

export function Comparison({ left, right }: { left: RunDetail; right: RunDetail }) {
  const ids = [...new Set([...(left.record?.cases.map((item) => item.caseId) ?? []), ...(right.record?.cases.map((item) => item.caseId) ?? [])])];
  return <div className="comparison">
    <div className="panel"><table className="comparison-summary"><thead><tr><th></th><th>Before</th><th>After</th></tr></thead><tbody>
      <tr><th>Run</th>{[left, right].map((item, i) => <td key={i}><code title={item.summary.runId}>{short(item.summary.runId)}</code> · <Badge value={item.summary.outcome} /></td>)}</tr>
      <tr><th>Plan / revision</th>{[left, right].map((item, i) => <td key={i}>{item.summary.planId} / <code title={item.summary.revision ?? ""}>{short(item.summary.revision)}</code></td>)}</tr>
      <tr><th>Git</th>{[left, right].map((item, i) => <td key={i}><code title={item.summary.testedCommit ?? ""}>{short(item.summary.testedCommit)}</code> · {item.summary.worktreeDirty === null ? "unknown" : item.summary.worktreeDirty ? "dirty" : "clean"}</td>)}</tr>
      <tr><th>Started</th>{[left, right].map((item, i) => <td key={i}>{date(item.summary.startedAt)}</td>)}</tr>
    </tbody></table></div>
    {ids.map((id) => {
      const a = left.record?.cases.find((item) => item.caseId === id);
      const b = right.record?.cases.find((item) => item.caseId === id);
      const count = Math.max(a?.assertions.length ?? 0, b?.assertions.length ?? 0);
      return <details className="panel comparison-case" key={id}><summary><strong>{id}</strong> · {a?.title ?? b?.title} <Badge value={a?.status ?? "absent"} /> → <Badge value={b?.status ?? "absent"} /></summary>
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
      </details>;
    })}
  </div>;
}
