/**
 * Decomposes a user goal into 3–5 delegable subtasks (Sonnet).
 *
 * Forces tool-use on `submit_subtasks` so the orchestrator never replies with
 * prose — we get a schema-validated list of {description, skill_hint} pairs
 * that downstream `classify` + `selectAgent` can operate on. The skill_hint is
 * later used by the router to match specialists inside the agent pool.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { ApiError, requireTrimmedString } from "./http";
import { LLM_MOCK_MODE, ORCHESTRATOR_MODEL } from "./config";
import { mockDecompose } from "./mock-llm";

interface DecomposedSubtask {
  description: string;
  skill_hint: string;
}

const ORCHESTRATOR_SYSTEM = `You are an orchestrator. Given a product/work goal, decompose it into 3 to 5 well-scoped subtasks that can each be delegated to a specialized agent.

Complexity rules — you MUST follow these:
- You MUST produce subtasks at different complexity levels. Never assign the same complexity to every subtask.
- Every decomposition MUST include at least one simple subtask (formatting, structuring, organizing, summarizing finished content). Even for complex goals, there is always a formatting or structuring step.
- Separate ANALYSIS from FORMATTING: "Draft the full document" is complex. "Format the draft into a clean structured template" or "Create an executive checklist from the completed sections" is simple.
- Reserve complex only for genuine multi-step reasoning (research, legal analysis, architecture). Writing from a clear brief is moderate. Structuring, formatting, and extracting is simple.
- Skill hints must be specific to the subtask type: "research", "drafting", "compliance", "formatting", "summarization", "translation", "analysis".

You MUST call the "submit_subtasks" tool exactly once with your decomposition. Do not reply with prose.`;

const TOOL = {
  name: "submit_subtasks",
  description: "Submit the decomposed subtasks for the goal",
  input_schema: {
    type: "object" as const,
    properties: {
      subtasks: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description:
                "Imperative subtask description (e.g., 'Design the pricing tier structure for the SaaS product')",
            },
            skill_hint: {
              type: "string",
              description:
                "Short tag matching an expected agent skill (e.g., 'pricing', 'copywriting', 'formatting')",
            },
          },
          required: ["description", "skill_hint"],
        },
      },
    },
    required: ["subtasks"],
  },
};

export async function decompose(goal: string): Promise<DecomposedSubtask[]> {
  const normalizedGoal = requireTrimmedString(goal, "goal", { maxLength: 5000 });
  if (LLM_MOCK_MODE) {
    return mockDecompose(normalizedGoal);
  }
  const client = getAnthropic();
  const res = await client.messages.create({
    model: ORCHESTRATOR_MODEL,
    max_tokens: 1024,
    system: ORCHESTRATOR_SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "submit_subtasks" },
    messages: [{ role: "user", content: `Goal: ${normalizedGoal}` }],
  });
  const toolUse = res.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
  );
  if (!toolUse) {
    throw new ApiError(
      502,
      "invalid_orchestrator_output",
      "orchestrator did not call submit_subtasks",
    );
  }
  const input = toolUse.input as { subtasks: DecomposedSubtask[] };
  if (!Array.isArray(input.subtasks) || input.subtasks.length < 3) {
    throw new ApiError(
      502,
      "invalid_orchestrator_output",
      "orchestrator returned fewer than 3 subtasks",
    );
  }
  return input.subtasks.map((subtask, index) => ({
    description: requireTrimmedString(
      subtask?.description,
      `subtasks[${index}].description`,
      { maxLength: 500 },
    ),
    skill_hint: requireTrimmedString(
      subtask?.skill_hint,
      `subtasks[${index}].skill_hint`,
      { maxLength: 80 },
    ).toLowerCase(),
  }));
}
