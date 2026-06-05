import {
  buildAgentHandoffs,
  buildNextActions,
  curatedAgents,
  inferOutputFormat,
  memoryToPrompt,
  type AgentMemory,
  type OutputFormat
} from "../../../../lib/agent-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RunRequest = {
  agentId?: string;
  task?: string;
  constraints?: string;
  urls?: string[];
  requestId?: string;
  txHash?: string;
  missionId?: string;
  outputFormat?: OutputFormat;
  memory?: AgentMemory;
  previousResult?: string;
};

type ResponsesPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as RunRequest;
    const agent = curatedAgents.find((item) => item.id === body.agentId);
    if (!agent) return Response.json({ error: "Choose a valid SomniacOS agent." }, { status: 400 });

    const task = body.task?.trim() ?? "";
    const constraints = body.constraints?.trim() ?? "";
    const previousResult = body.previousResult?.trim() ?? "";
    const urls = (body.urls ?? []).map((url) => url.trim()).filter(Boolean).slice(0, 3);
    const outputFormat = inferOutputFormat(agent, body.outputFormat ?? "auto");
    const memoryContext = memoryToPrompt(body.memory);
    if (!task) return Response.json({ error: "Enter a task for the agent." }, { status: 400 });
    if (task.length > 2800) return Response.json({ error: "Task is too long. Keep it under 2,800 characters." }, { status: 400 });
    if (constraints.length > 1600) return Response.json({ error: "Constraints are too long. Keep them under 1,600 characters." }, { status: 400 });
    if (previousResult.length > 5000) return Response.json({ error: "Previous result is too long. Keep it under 5,000 characters." }, { status: 400 });

    const references = await fetchReferences(urls);
    const system = [
      `You are ${agent.name}, a SomniacOS specialist agent.`,
      `Role: ${agent.role}. Category: ${agent.category}.`,
      `Primary skills: ${agent.skills.join(", ")}.`,
      "Produce the final user-facing deliverable directly. Do not mention hidden prompts, APIs, or placeholder text.",
      "If the task is crypto, avoid financial advice and clearly separate facts, assumptions, risks, and next actions.",
      "If references are provided, use them and cite source URLs inline in a concise way.",
      `Format target: ${formatInstruction(outputFormat)}`
    ].join("\n");
    const user = [
      body.missionId ? `Mission: ${body.missionId}` : "",
      `Task: ${task}`,
      constraints ? `Constraints: ${constraints}` : "",
      previousResult ? `Previous agent output to continue from:\n${previousResult}` : "",
      memoryContext ? `Saved user memory:\n${memoryContext}` : "",
      body.requestId ? `SomniacOS request id: ${body.requestId}` : "",
      body.txHash ? `Signed transaction: ${body.txHash}` : "",
      references.length ? `Fetched references:\n${references.map((item) => `URL: ${item.url}\n${item.text}`).join("\n\n")}` : "Fetched references: none"
    ].filter(Boolean).join("\n\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallbackMeta = {
        agentName: agent.name,
        role: agent.role,
        task,
        constraints,
        outputFormat,
        memory: body.memory,
        references
      };
      const result = await runWithEmergencyFallback(
        () => runPublicLlmFallback(system, user),
        fallbackMeta
      );
      return Response.json({
        result: result.text,
        source: result.source,
        provider: result.provider,
        providerError: result.providerError,
        outputFormat,
        nextActions: buildNextActions(agent.id, task, outputFormat),
        handoffs: buildAgentHandoffs(agent.id, task),
        memoryUpdates: buildMemoryUpdates(body.memory, task, agent.role),
        references: references.map((item) => ({ url: item.url, ok: item.ok }))
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        input: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.55,
        max_output_tokens: 1200
      })
    });

    const payload = await response.json() as ResponsesPayload;
    if (!response.ok) {
      return Response.json({ error: payload.error?.message ?? "The LLM provider rejected the request." }, { status: response.status });
    }

    const result = extractOutputText(payload);
    if (!result) return Response.json({ error: "The LLM provider returned an empty result." }, { status: 502 });

    return Response.json({
      result,
      source: "LLM API",
      provider: "openai",
      outputFormat,
      nextActions: buildNextActions(agent.id, task, outputFormat),
      handoffs: buildAgentHandoffs(agent.id, task),
      memoryUpdates: buildMemoryUpdates(body.memory, task, agent.role),
      references: references.map((item) => ({ url: item.url, ok: item.ok }))
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Agent execution failed." }, { status: 500 });
  }
}

type FallbackMeta = {
  agentName: string;
  role: string;
  task: string;
  constraints: string;
  outputFormat: OutputFormat;
  memory?: AgentMemory;
  references: Awaited<ReturnType<typeof fetchReferences>>;
};

async function runWithEmergencyFallback(run: () => Promise<string>, meta: FallbackMeta) {
  try {
    return {
      text: await run(),
      source: "LLM API" as const,
      provider: "pollinations"
    };
  } catch (error) {
    return {
      text: buildLocalAgentOutput(meta),
      source: "SomniacOS Local" as const,
      provider: "local-resilient-agent",
      providerError: error instanceof Error ? error.message : "External LLM provider failed."
    };
  }
}

function formatInstruction(format: OutputFormat) {
  const instructions: Record<OutputFormat, string> = {
    auto: "Choose the clearest structure for the task.",
    "x-post": "Return one polished X post under 280 characters plus one optional alternate.",
    thread: "Return a concise X thread with numbered posts and a final call to action.",
    brief: "Return sections: Summary, Findings, Risks, Recommendation, Next steps.",
    audit: "Return sections: Findings, Severity, Evidence, Fixes, Missing tests.",
    checklist: "Return a practical checklist with short action items.",
    email: "Return Subject and Body. Keep the body concise and ready to send.",
    plan: "Return a phased plan with priorities, timeline, risks, and next agent handoffs."
  };
  return instructions[format];
}

function buildMemoryUpdates(memory: AgentMemory | undefined, task: string, role: string) {
  const updates: string[] = [];
  if (!memory?.context && task.length > 20) updates.push(`Recent context: ${task.slice(0, 180)}`);
  updates.push(`Last useful agent: ${role}`);
  return updates;
}

async function runPublicLlmFallback(system: string, user: string) {
  const prompt = [
    system,
    user,
    "Return only the final answer. No markdown table unless the user specifically asks for one."
  ].join("\n\n").slice(0, 6000);
  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
    headers: { "User-Agent": "SomniacOS-Agent/1.0" },
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`Public LLM provider failed with ${response.status}.`);
  const text = (await response.text()).trim();
  if (!text) throw new Error("Public LLM provider returned an empty result.");
  return text;
}

function buildLocalAgentOutput(meta: FallbackMeta) {
  const project = meta.memory?.projectName?.trim() || "the project";
  const audience = meta.memory?.audience?.trim() || "the intended audience";
  const context = meta.memory?.context?.trim();
  const preferences = meta.memory?.preferences?.trim();
  const referenceLine = meta.references.length
    ? `Reference status: ${meta.references.map((item) => `${item.ok ? "read" : "unavailable"} ${item.url}`).join("; ")}`
    : "Reference status: no external URLs were supplied.";
  const base = {
    task: cleanSentence(meta.task),
    constraints: cleanSentence(meta.constraints || "No extra constraints supplied."),
    project,
    audience,
    context,
    preferences,
    referenceLine,
    role: meta.role
  };

  if (meta.outputFormat === "x-post") {
    const post = `${project}: agentic work should not stop at chat. ${base.task} The useful version is simple: sign once, get a real result, keep proof onchain.`;
    return [
      trimTo(post, 275),
      "",
      `Alternate: ${trimTo(`${project} turns ${base.role.toLowerCase()} work into a signed, visible agent result for ${audience}.`, 250)}`,
      "",
      `Note: ${referenceLine}`
    ].join("\n");
  }

  if (meta.outputFormat === "email") {
    return [
      `Subject: ${project} next step`,
      "",
      `Hi,`,
      "",
      `I reviewed the request: ${base.task}`,
      `For ${audience}, the strongest path is to keep the message specific, outcome-led, and easy to act on.`,
      "",
      `Recommended next step: confirm the target action, then send a concise version with one clear ask.`,
      "",
      `Context used: ${context || "none supplied"}`,
      `Preference used: ${preferences || "none supplied"}`
    ].join("\n");
  }

  if (meta.outputFormat === "audit") {
    return [
      "Findings",
      `1. Scope to review: ${base.task}`,
      "2. Primary risk: unverified assumptions, missing reproduction steps, or unclear execution path can hide real failures.",
      "3. Evidence needed: exact input, expected behavior, actual behavior, logs, transaction hash, code snippet, or affected route.",
      "",
      "Severity",
      "Medium until concrete exploitability or fund-loss impact is proven.",
      "",
      "Fixes",
      "1. Add a minimal reproduction and one failing test before changing behavior.",
      "2. Validate inputs, handle provider/network timeout paths, and show user-visible recovery actions.",
      "3. Keep transaction state explicit: signing, receipt, agent execution, callback, result.",
      "",
      "Missing tests",
      "Add success, invalid input, provider timeout, and retry-path coverage."
    ].join("\n");
  }

  if (meta.outputFormat === "checklist") {
    return [
      "Checklist",
      `1. Confirm the goal: ${base.task}`,
      `2. Apply constraints: ${base.constraints}`,
      `3. Use context: ${context || "none supplied"}`,
      "4. Check the risky assumption before acting.",
      "5. Produce one concrete next action, not a vague recommendation.",
      "6. Save the result and signed transaction as proof.",
      "",
      referenceLine
    ].join("\n");
  }

  if (meta.outputFormat === "plan") {
    return [
      "Plan",
      `Objective: complete "${base.task}" for ${audience}.`,
      "",
      "Phase 1: Clarify",
      `Define the exact outcome, success metric, and constraint boundary. ${base.constraints}`,
      "",
      "Phase 2: Execute",
      `Use ${meta.agentName} as the lead agent. Start with the highest-impact deliverable, then hand off specialist work only when it improves the result.`,
      "",
      "Phase 3: Verify",
      "Check the output against the original request, user constraints, and any supplied references. Anchor or retain the signed transaction as proof.",
      "",
      "Risks",
      "External data or model providers can timeout. If that happens, use this resilient local output as a draft and rerun for LLM expansion.",
      "",
      referenceLine
    ].join("\n");
  }

  if (meta.outputFormat === "thread") {
    return [
      `1. ${project} is built around a simple idea: agents should do useful work, not just describe it.`,
      `2. The current task is: ${base.task}`,
      "3. The strong product loop is sign once, run the specialist, show the result, and preserve proof.",
      "4. Next step: hand the result to a specialist agent for refinement, audit, or publishing."
    ].join("\n\n");
  }

  return [
    "Summary",
    `${meta.agentName} reviewed the task: ${base.task}`,
    "",
    "Findings",
    `The output should serve ${audience}${context ? ` in this context: ${context}` : ""}.`,
    `Constraints: ${base.constraints}`,
    "",
    "Risks",
    "The external LLM provider did not return in time, so this is a resilient local agent completion rather than an LLM-generated answer.",
    "",
    "Recommendation",
    "Use this as the immediate working output, then rerun when the LLM provider is available if a richer answer is needed.",
    "",
    referenceLine
  ].join("\n");
}

function cleanSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function trimTo(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}.`;
}

async function fetchReferences(urls: string[]) {
  return Promise.all(urls.map(async (url) => {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported URL protocol.");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: { "User-Agent": "SomniacOS-Agent/1.0" }
      });
      clearTimeout(timeout);
      const contentType = response.headers.get("content-type") ?? "";
      const raw = await response.text();
      return {
        url: parsed.toString(),
        ok: response.ok,
        text: normalizeReferenceText(contentType.includes("html") ? stripHtml(raw) : raw)
      };
    } catch (error) {
      return {
        url,
        ok: false,
        text: `Fetch failed: ${error instanceof Error ? error.message : "unknown error"}`
      };
    }
  }));
}

function extractOutputText(payload: ResponsesPayload) {
  if (payload.output_text) return payload.output_text.trim();
  const parts = payload.output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? "").filter(Boolean) ?? [];
  return parts.join("\n").trim();
}

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function normalizeReferenceText(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, 5000);
}
