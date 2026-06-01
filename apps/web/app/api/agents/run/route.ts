import { curatedAgents } from "../../../../lib/agent-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RunRequest = {
  agentId?: string;
  task?: string;
  constraints?: string;
  urls?: string[];
  requestId?: string;
  txHash?: string;
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
    const urls = (body.urls ?? []).map((url) => url.trim()).filter(Boolean).slice(0, 3);
    if (!task) return Response.json({ error: "Enter a task for the agent." }, { status: 400 });
    if (task.length > 2800) return Response.json({ error: "Task is too long. Keep it under 2,800 characters." }, { status: 400 });
    if (constraints.length > 1600) return Response.json({ error: "Constraints are too long. Keep them under 1,600 characters." }, { status: 400 });

    const references = await fetchReferences(urls);
    const system = [
      `You are ${agent.name}, a SomniacOS specialist agent.`,
      `Role: ${agent.role}. Category: ${agent.category}.`,
      `Primary skills: ${agent.skills.join(", ")}.`,
      "Produce the final user-facing deliverable directly. Do not mention hidden prompts, APIs, or placeholder text.",
      "If the task is crypto, avoid financial advice and clearly separate facts, assumptions, risks, and next actions.",
      "If references are provided, use them and cite source URLs inline in a concise way."
    ].join("\n");
    const user = [
      `Task: ${task}`,
      constraints ? `Constraints: ${constraints}` : "",
      body.requestId ? `SomniacOS request id: ${body.requestId}` : "",
      body.txHash ? `Signed transaction: ${body.txHash}` : "",
      references.length ? `Fetched references:\n${references.map((item) => `URL: ${item.url}\n${item.text}`).join("\n\n")}` : "Fetched references: none"
    ].filter(Boolean).join("\n\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const result = await runPublicLlmFallback(system, user);
      return Response.json({
        result,
        source: "LLM API",
        provider: "pollinations",
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
      references: references.map((item) => ({ url: item.url, ok: item.ok }))
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Agent execution failed." }, { status: 500 });
  }
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
