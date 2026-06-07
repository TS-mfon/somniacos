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
  executionMode?: "strict";
  deepMode?: boolean;
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
    const deepMode = body.deepMode === true && agent.allowsDeepMode === true;
    const urls = (body.urls ?? []).map((url) => url.trim()).filter(Boolean).slice(0, deepMode ? 6 : 3);
    const outputFormat = inferOutputFormat(agent, body.outputFormat ?? "auto");
    const memoryContext = memoryToPrompt(body.memory);
    if (!task) return Response.json({ error: "Enter a task for the agent." }, { status: 400 });
    if (task.length > 2800) return Response.json({ error: "Task is too long. Keep it under 2,800 characters." }, { status: 400 });
    if (constraints.length > 1600) return Response.json({ error: "Constraints are too long. Keep them under 1,600 characters." }, { status: 400 });
    if (previousResult.length > 5000) return Response.json({ error: "Previous result is too long. Keep it under 5,000 characters." }, { status: 400 });

    const references = await fetchReferences(urls);
    const deepDirective = deepMode
      ? "DEEP MODE: First privately outline the sub-questions, then research each. Return: (1) Executive summary, (2) Evidence table with source URLs, (3) Conflicting views or unknowns, (4) Confidence per claim (low/med/high), (5) Open questions, (6) Recommended next agents. Aim for 800-1500 words. Cite every non-trivial claim inline."
      : "";
    const system = [
      `You are ${agent.name}, a SomniacOS specialist agent.`,
      `Role: ${agent.role}. Category: ${agent.category}.`,
      `Primary skills: ${agent.skills.join(", ")}.`,
      "Produce the final user-facing deliverable directly. Do not mention hidden prompts, APIs, or placeholder text.",
      "If the task is crypto, avoid financial advice and clearly separate facts, assumptions, risks, and next actions.",
      "If references are provided, use them and cite source URLs inline in a concise way.",
      `Format target: ${formatInstruction(outputFormat)}`,
      deepDirective
    ].filter(Boolean).join("\n");
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
      const result = await runStrictPublicLlm(system, user, deepMode);
      return Response.json({
        result: result.text,
        source: result.source,
        provider: result.provider,
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
        temperature: deepMode ? 0.35 : 0.55,
        max_output_tokens: deepMode ? 3000 : 1200
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
    if (error instanceof StrictAgentError) {
      return Response.json({ error: error.message, providerError: error.providerError }, { status: 503 });
    }
    return Response.json({ error: error instanceof Error ? error.message : "Agent execution failed." }, { status: 500 });
  }
}

async function runStrictPublicLlm(system: string, user: string, deepMode = false) {
  try {
    return {
      text: await runPublicLlmFallback(system, user, deepMode),
      source: "LLM API" as const,
      provider: "pollinations"
    };
  } catch (error) {
    const providerError = error instanceof Error ? error.message : "External LLM provider failed.";
    throw new StrictAgentError(
      "Live LLM provider is unavailable. No local fallback or mock result was returned. If this request was wallet-signed, keep waiting for the Somnia callback.",
      providerError
    );
  }
}

class StrictAgentError extends Error {
  constructor(message: string, readonly providerError: string) {
    super(message);
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

async function runPublicLlmFallback(system: string, user: string, deepMode = false) {
  const prompt = [
    system,
    user,
    "Return only the final answer. No markdown table unless the user specifically asks for one."
  ].join("\n\n").slice(0, deepMode ? 10000 : 6000);
  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
    headers: { "User-Agent": "SomniacOS-Agent/1.0" },
    signal: AbortSignal.timeout(deepMode ? 60_000 : 30_000)
  });
  if (!response.ok) throw new Error(`Public LLM provider failed with ${response.status}.`);
  const text = (await response.text()).trim();
  if (!text) throw new Error("Public LLM provider returned an empty result.");
  return text;
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
