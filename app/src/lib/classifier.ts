/**
 * Classifies a subtask description into a `Tier` using Haiku.
 *
 * Calls the classifier model with a strict JSON-only prompt, parses the
 * response, and falls back to `moderate` if the output can't be parsed — we
 * never let a broken classification take down an orchestration run. Honors the
 * `FORCE_ROUTING` env override (see `config.ts`) so demos can pin the tier for
 * known keywords without touching the model.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { CLASSIFIER_MODEL, LLM_MOCK_MODE, parseForceRouting } from "./config";
import { ApiError, requireTrimmedString } from "./http";
import { mockClassify } from "./mock-llm";
import type { Classification, Tier } from "./types";

const SYSTEM_PROMPT = `You are a task complexity classifier. Given a subtask description and an optional skill_hint, output JSON only:
{"tier": "simple" | "moderate" | "complex", "reason": "one sentence", "estimated_tokens": <integer>}

Tier is determined by TASK TYPE, not topic complexity. A checklist is simple even across 10 jurisdictions.

Rules by task type:
- simple: formatting, structuring, checklists, extraction, translation, yes/no decisions (<500 tokens)
- moderate: drafting, writing, summarization, compliance review, code generation, single-domain analysis (500-2000 tokens)
- complex: multi-step reasoning across multiple domains, architecture design, cross-jurisdictional strategy, evaluation of competing scenarios (>2000 tokens)

If a skill_hint is provided, use it as a strong prior:
- "formatting", "summarization", "translation", "extraction" → simple
- "drafting", "writing", "compliance", "analysis" → moderate
- "research", "strategy", "architecture", "evaluation" → complex
The skill_hint overrides surface-level topic words like "multi-jurisdictional" or "complex".

Output VALID JSON only, no prose, no code fences.`;

function keyword(s: string): string | undefined {
  const lower = s.toLowerCase();
  if (/pricing|architect|strategy|design\s+the/.test(lower)) return "pricing";
  if (/landing|copy|headline|hero/.test(lower)) return "landing";
  if (/faq|format|bullet|structure/.test(lower)) return "faq";
  return undefined;
}

function applyForceRouting(description: string, base: Classification): Classification {
  const overrides = parseForceRouting();
  const k = keyword(description);
  if (k && overrides[k]) {
    const tier = overrides[k] as Tier;
    return { ...base, tier, reason: `[forced] ${base.reason}` };
  }
  return base;
}

export async function classify(description: string, skillHint?: string): Promise<Classification> {
  const normalizedDescription = requireTrimmedString(description, "description", {
    maxLength: 2000,
  });
  if (LLM_MOCK_MODE) {
    return applyForceRouting(normalizedDescription, mockClassify(normalizedDescription, skillHint));
  }
  const client = getAnthropic();
  const userContent = skillHint
    ? `skill_hint: ${skillHint}\nSubtask: ${normalizedDescription}`
    : `Subtask: ${normalizedDescription}`;
  const res = await client.messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });
  const raw = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  // Strip markdown code fences that models sometimes add despite the prompt
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: Classification;
  try {
    parsed = JSON.parse(text) as Classification;
    if (!["simple", "moderate", "complex"].includes(parsed.tier)) {
      throw new Error(`invalid tier: ${parsed.tier}`);
    }
    if (typeof parsed.reason !== "string" || !parsed.reason.trim()) {
      throw new Error("invalid reason");
    }
    if (
      typeof parsed.estimated_tokens !== "number" ||
      !Number.isFinite(parsed.estimated_tokens) ||
      parsed.estimated_tokens <= 0
    ) {
      throw new Error("invalid estimated_tokens");
    }
  } catch {
    parsed = {
      tier: "moderate",
      reason: "classifier output unparseable, defaulting to moderate",
      estimated_tokens: 1000,
    };
  }
  try {
    return applyForceRouting(normalizedDescription, parsed);
  } catch {
    throw new ApiError(502, "classifier_failed", "classifier failed to produce a usable result");
  }
}
