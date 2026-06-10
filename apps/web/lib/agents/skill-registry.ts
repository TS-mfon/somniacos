import type { Address } from "viem";
import { agentEconomyContracts } from "./contracts";

export type SkillInputField =
  | { name: string; label: string; type: "string"; placeholder?: string; rows?: number }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[] };

export type SkillMeta = {
  id: string;
  name: string;
  category: "Content + Code" | "Verification" | "Decision" | "Monitoring" | "Truth & Oracle" | "Action Safety";
  description: string;
  module: Address;
  functionName: string;
  // Each field maps positionally to a `draft()`-style argument.
  fields: SkillInputField[];
  // Event the dispatcher resolver emits; the UI filters logs by it.
  resolvedEventName: string;
  estimatedLatencySeconds: number;
};

export const skillRegistry: SkillMeta[] = [
  {
    id: "drafter",
    name: "Drafter",
    category: "Content + Code",
    description:
      "Generates polished short-form text (tweet, thread, email, press release) from a topic, audience, and format. Runs as a real Somnia validator inference and resolves on-chain.",
    module: agentEconomyContracts.ContentCodeSkills,
    functionName: "draft",
    resolvedEventName: "DraftResolved",
    estimatedLatencySeconds: 10,
    fields: [
      { name: "topic", label: "Topic", type: "string", placeholder: "Somnia winning a hackathon", rows: 2 },
      { name: "audience", label: "Audience", type: "string", placeholder: "X / crypto builders" },
      {
        name: "format",
        label: "Format",
        type: "select",
        options: [
          { value: "TWEET", label: "Tweet (≤280 chars)" },
          { value: "THREAD", label: "X thread (numbered)" },
          { value: "EMAIL", label: "Email" },
          { value: "PRESS_RELEASE", label: "Press release" },
        ],
      },
    ],
  },
];

export function getSkill(id: string): SkillMeta | undefined {
  return skillRegistry.find((skill) => skill.id === id);
}
