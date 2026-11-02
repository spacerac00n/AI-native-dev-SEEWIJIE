import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { caseExplanation, expectation, observation } from "./presentation";
import type { CaseExecution, RunDetail } from "@veriqa/contracts";
import { artifactUrl, cleanLog, date, display } from "./api";

export function Badge({ value }: { value: string }) {
  const positive = ["passed", "approved", "validated"].includes(value);
  const negative = ["failed", "assertion-failed", "execution-error", "rejected"].includes(value);
  return <span className={`badge ${positive ? "positive" : negative ? "negative" : "neutral"}`}>
    <span aria-hidden="true">{positive ? "✓" : negative ? "!" : "•"}</span> {value === "assertion-failed" ? "failed" : value.replaceAll("-", " ")}
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
    <details className="technical"><summary>Logs & traces</summary>{traces.map((path) => <a className="trace-link" key={path} href={artifactUrl(runId, path)}>↓ Download Playwright trace</a>)}
    {traces.length > 0 && <p className="muted small">Open ZIP in Playwright Trace Viewer.</p>}
    {item.errors.length > 0 && <pre className="failure-output">{cleanLog(item.errors.join("\n\n"))}</pre>}
    <Logs runId={runId} paths={item.artifacts.filter((path) => path.endsWith(".log.json") || path.endsWith("result.json"))} /></details>
  </div>;
}

export function TechnicalDetails({ children }: { children: ReactNode }) {
  return <details className="technical"><summary>Technical details</summary>{children}</details>;
}

function RunTechnical({ detail }: { detail: RunDetail }) {
  const { summary, record } = detail;
  return <TechnicalDetails><dl className="metadata">
    <div><dt>Run ID</dt><dd><code>{summary.runId}</code></dd></div>
    <div><dt>Git commit / worktree</dt><dd>{summary.testedCommit ?? "Unknown"} · {summary.worktreeDirty === null ? "unknown" : summary.worktreeDirty ? "dirty" : "clean"}</dd></div>
    <div><dt>Plan / revision</dt><dd>{summary.planId} / {summary.revision}</dd></div>
    {record && <><div><dt>Content hash</dt><dd>{record.metadata.contentHash}</dd></div>
      <div><dt>Approval</dt><dd>{record.approval.approvedBy} · {date(record.approval.approvedAt)}<br />{record.approval.approvalId}</dd></div>
      <div><dt>Command / exit</dt><dd><code>{record.metadata.command}</code><br />Exit code: {record.metadata.exitCode}</dd></div></>}
  </dl>{summary.error && <pre>{summary.error}</pre>}
    <details><summary>Raw execution output</summary><Logs runId={summary.runId} paths={detail.artifacts.filter((path) => ["stdout.log", "stderr.log", "command.json", "attempt.json", "rejection.json"].includes(path))} /></details>
    {record && <><a href={artifactUrl(summary.runId, "run.json")} target="_blank" rel="noreferrer">Open structured run JSON ↗</a><details><summary>Complete metadata & provenance</summary><pre>{display(record.metadata)}</pre><pre>{display(record.approval)}</pre><pre>{display(record.plan.plan.provenance)}</pre></details></>}
  </TechnicalDetails>;
}
function Assertions({ item }: { item: CaseExecution }) {
  return <details className="assertion-details"><summary>Individual checks</summary>{item.assertions.map((value) => <div className="check-row" key={value.index}>
    <Badge value={value.status} /><p>{expectation(value.definition)}<br /><span className="muted">{observation(value)}</span></p>
    <TechnicalDetails><pre>{display(value)}</pre></TechnicalDetails>
  </div>)}</details>;
}
export function RunInspection({ detail }: { detail: RunDetail }) {
  const { summary, record } = detail;
  return <section className="panel run-inspection" aria-label="Run details">
    <div className="between"><h2>{record?.plan.plan.title ?? "Test results"}</h2><Badge value={summary.outcome} /></div>
    <p className="small muted">{date(summary.startedAt)} · Real browser execution · mock OTP delivery</p>
    {!record && <p className="notice">{summary.outcome === "running" ? "Tests are running. Results will appear when execution finishes." : "This run did not produce completed results. It is not a passing run."}</p>}
    {record && <><div className="result-counts"><span><strong>{record.metadata.counts.passed}</strong> passed</span><span><strong>{record.metadata.counts.failed}</strong> failed / errors</span><span><strong>{record.metadata.counts.skipped}</strong> skipped</span></div>
      {record.cases.map((item) => <article className="result-item" key={item.caseId}>
        <details className="case-result"><summary><strong>{item.title}</strong><Badge value={item.status} /></summary>
          <div className="case-body"><CaseEvidence item={item} runId={summary.runId} /><Assertions item={item} />
            <TechnicalDetails><pre>{display(item)}</pre><p>{record.plan.plan.cases.find((entry) => entry.id === item.caseId)!.assertions.length - item.assertions.length} checks not executed.</p></TechnicalDetails>
          </div></details><p className={item.status === "assertion-failed" ? "failure-explanation" : "small muted"}>{caseExplanation(item)}</p>
      </article>)}</>}
    <RunTechnical detail={detail} />
  </section>;
}
function comparisonExplanation(item: CaseExecution, other?: CaseExecution) {
  const failed = other?.assertions.find(value => value.status === "failed");
  const matched = failed && item.assertions.find(value => value.index === failed.index);
  return matched ? `${expectation(matched.definition)} ${observation(matched)}` : caseExplanation(item);
}
export function Comparison({ left, right }: { left: RunDetail; right: RunDetail }) {
  const ids = [...new Set([...(left.record?.cases.map((item) => item.caseId) ?? []), ...(right.record?.cases.map((item) => item.caseId) ?? [])])];
  return <div className="comparison">
    <div className="comparison-overview compare-grid">{[left, right].map((detail, index) => <div key={index}><strong>{index === 0 ? "Before" : "After"}</strong> <Badge value={detail.summary.outcome} />
      <p className="small muted">{date(detail.summary.startedAt)}{detail.summary.counts && ` · ${detail.summary.counts.passed} passed · ${detail.summary.counts.failed} failed / errors`}</p></div>)}</div>
    {ids.map((id) => {
      const a = left.record?.cases.find((item) => item.caseId === id), b = right.record?.cases.find((item) => item.caseId === id);
      return <article className="panel" key={id}><details className="comparison-case"><summary><strong>{a?.title ?? b?.title}</strong><span className="status-transition"><Badge value={a?.status ?? "absent"} /> → <Badge value={b?.status ?? "absent"} /></span></summary>
        <div className="compare-grid evidence-pair">{[a,b].map((item,index) => <div className="compare-case-side" key={index}><strong>{index === 0 ? "Before" : "After"}</strong>
          {item ? <><CaseEvidence item={item} runId={index === 0 ? left.summary.runId : right.summary.runId} /><Assertions item={item} /></> : <p>Test not present in this run.</p>}</div>)}</div>
        <TechnicalDetails><pre>{display({ before: a, after: b })}</pre></TechnicalDetails>
      </details><div className="compare-grid behavior-summary">{[a,b].map((item,index) => <p key={index}><span className="small muted">{index === 0 ? "Before" : "After"}</span><br />{item ? comparisonExplanation(item, index === 0 ? b : a) : "Test not present."}</p>)}</div>
      {a && b && display(a.assertions.map(v=>v.definition)) !== display(b.assertions.map(v=>v.definition)) && <p className="difference">Expectations differ between these runs. A passing result does not establish a fix.</p>}
      </article>;
    })}
    <TechnicalDetails><div className="compare-grid"><RunTechnical detail={left} /><RunTechnical detail={right} /></div></TechnicalDetails>
  </div>;
}
