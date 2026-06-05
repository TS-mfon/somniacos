"use client";

import { useEffect, useMemo, useState } from "react";
import { GitCompare, Loader2, Save } from "lucide-react";
import { buildAgentHandoffs, buildNextActions, defaultMemory, outputFormats, regularWorkbenchAgents, scoreAgentRun, type AgentMemory, type AgentRunRecord, type CompareSession, type OutputFormat } from "../lib/agent-engine";
import { loadCompareSessions, upsertCompareSession } from "../lib/history-store";

export function ComparePage() {
  const [task, setTask] = useState("Create a launch post for an AI agent dApp on Somnia.");
  const [constraints, setConstraints] = useState("Make it concise, clear, and credible. Avoid hype.");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("brief");
  const [agentIds, setAgentIds] = useState<string[]>(["marketing-strategist", "content-writer"]);
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [sessions, setSessions] = useState<CompareSession[]>([]);
  const [memory, setMemory] = useState<AgentMemory>(defaultMemory());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSessions(loadCompareSessions());
    const stored = window.localStorage.getItem("somniacos.agentMemory");
    if (stored) {
      try {
        setMemory({ ...defaultMemory(), ...JSON.parse(stored) as AgentMemory });
      } catch {
        setMemory(defaultMemory());
      }
    }
  }, []);

  const selectedAgents = useMemo(() => regularWorkbenchAgents.filter((agent) => agentIds.includes(agent.id)), [agentIds]);
  const bestRun = useMemo(() => [...runs].sort((a, b) => (b.confidence?.score ?? 0) - (a.confidence?.score ?? 0))[0], [runs]);

  function toggleAgent(id: string) {
    setAgentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 3));
  }

  async function runCompare() {
    try {
      setError("");
      setRunning(true);
      setRuns([]);
      if (!task.trim()) throw new Error("Enter a task to compare.");
      if (selectedAgents.length < 2) throw new Error("Choose at least two agents.");
      const completed: AgentRunRecord[] = [];
      for (const agent of selectedAgents) {
        const requestId = `compare-${Date.now()}-${agent.id}`;
        const response = await fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agent.id, task, constraints, outputFormat, memory, requestId, missionId: "compare" })
        });
        const payload = await response.json() as { result?: string; source?: AgentRunRecord["source"]; outputFormat?: OutputFormat; error?: string };
        const base: AgentRunRecord = {
          requestId,
          user: "compare-lab",
          appAgentId: agent.id,
          task,
          constraints,
          url: "",
          somniaAgentId: "",
          mode: "LLM",
          status: response.ok && payload.result ? "Success" : "Failed",
          result: payload.result ?? payload.error ?? "Agent comparison failed.",
          source: payload.source ?? "LLM API",
          missionId: "compare",
          outputFormat: payload.outputFormat ?? outputFormat,
          nextActions: buildNextActions(agent.id, task, outputFormat),
          handoffs: buildAgentHandoffs(agent.id, task),
          memorySnapshot: [memory.projectName, memory.audience, memory.context].filter(Boolean).join(" | "),
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        };
        completed.push({ ...base, confidence: scoreAgentRun(base) });
        setRuns([...completed]);
      }
      const session: CompareSession = {
        id: `compare:${Date.now()}`,
        task,
        constraints,
        outputFormat,
        agentIds,
        results: completed,
        createdAt: new Date().toISOString()
      };
      upsertCompareSession(session);
      setSessions(loadCompareSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compare run failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-signal"><GitCompare className="h-4 w-4" /> Result compare</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Run the same task through multiple agents.</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">Compare uses the real agent API. It is not a signed onchain proof flow; run the winning task in Workbench when you need wallet-backed proof.</p>
        <div className="mt-6 grid gap-4">
          <label>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Task</span>
            <textarea value={task} onChange={(event) => setTask(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
          </label>
          <label>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Constraints</span>
            <textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
          </label>
          <label>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Format</span>
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60">
              {outputFormats.map((format) => <option key={format.id} value={format.id}>{format.label}</option>)}
            </select>
          </label>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Agents, choose 2-3</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {regularWorkbenchAgents.slice(0, 12).map((agent) => (
                <button key={agent.id} onClick={() => toggleAgent(agent.id)} className={`rounded-xl border p-3 text-left text-sm transition ${agentIds.includes(agent.id) ? "border-signal/50 bg-signal/10 text-white" : "border-white/10 bg-[#101010] text-white/55 hover:border-signal/25"}`}>
                  <span className="block font-semibold">{agent.role}</span>
                  <span className="mt-1 block text-xs opacity-70">{agent.name}</span>
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}
          <button onClick={runCompare} disabled={running} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 font-semibold text-black disabled:opacity-60">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Run compare
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Best current result</p>
          {bestRun ? <p className="mt-3 text-sm leading-6 text-white/62">{bestRun.confidence?.label} confidence from {regularWorkbenchAgents.find((agent) => agent.id === bestRun.appAgentId)?.role}.</p> : <p className="mt-3 text-sm leading-6 text-white/45">Run a comparison to score the outputs.</p>}
        </div>
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Saved sessions</p>
          <p className="mt-3 text-3xl font-semibold text-white">{sessions.length}</p>
        </div>
      </aside>

      <section className="xl:col-span-2 grid gap-4 md:grid-cols-2">
        {runs.map((run) => (
          <article key={run.requestId} className="panel rounded-[1.5rem] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">{regularWorkbenchAgents.find((agent) => agent.id === run.appAgentId)?.role}</h3>
              {run.confidence ? <span className="rounded-full border border-signal/25 bg-signal/10 px-3 py-1 font-mono text-xs text-signal">{run.confidence.label} {run.confidence.score}%</span> : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/72">{run.result}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
