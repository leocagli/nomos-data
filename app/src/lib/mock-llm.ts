import type { Agent, Classification, ModelId, Tier } from "./types";

type DecomposedSubtask = {
  description: string;
  skill_hint: string;
};

const SIMPLE_HINTS = new Set([
  "formatting",
  "summarization",
  "translation",
  "extraction",
  "faq",
]);

const COMPLEX_HINTS = new Set([
  "research",
  "strategy",
  "architecture",
  "evaluation",
]);

function compact(input: string, max = 140): string {
  const text = input.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function inferSkillHint(text: string): string {
  const lower = text.toLowerCase();
  if (/format|faq|checklist|bullet|structure|table/.test(lower)) return "formatting";
  if (/headline|hero|copy|landing|thread|faq/.test(lower)) return "drafting";
  if (/price|package|strategy|architecture|design|evaluate|compare/.test(lower)) return "strategy";
  if (/research|analy[sz]e|review|compliance|memo/.test(lower)) return "analysis";
  if (/summari[sz]e|summary|brief/.test(lower)) return "summarization";
  return "drafting";
}

function classifyFromHint(skillHint: string, description: string): Classification {
  const normalizedHint = skillHint.toLowerCase();
  const lower = description.toLowerCase();

  let tier: Tier = "moderate";
  if (SIMPLE_HINTS.has(normalizedHint) || /format|faq|checklist|bullet|extract|translate/.test(lower)) {
    tier = "simple";
  } else if (COMPLEX_HINTS.has(normalizedHint) || /research|architect|strategy|evaluate|cross-functional/.test(lower)) {
    tier = "complex";
  }

  const estimated_tokens = tier === "simple" ? 360 : tier === "complex" ? 2400 : 1100;
  return {
    tier,
    reason: `mock classifier selected ${tier} based on the task shape and skill hint`,
    estimated_tokens,
  };
}

export function mockDecompose(goal: string): DecomposedSubtask[] {
  const goalText = compact(goal, 180);
  const clauses = goal
    .split(/(?:\.|;|\n|, and | and )/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 12)
    .slice(0, 3);

  const subtasks: DecomposedSubtask[] = clauses.map((clause, index) => ({
    description:
      index === 0
        ? `Analyze the requirements and success criteria for: ${compact(clause)}`
        : index === 1
          ? `Draft the main deliverable for: ${compact(clause)}`
          : `Format and package the output for: ${compact(clause)}`,
    skill_hint: inferSkillHint(clause),
  }));

  while (subtasks.length < 3) {
    subtasks.push(
      {
        description: `Analyze the brief and map the main requirements for: ${goalText}`,
        skill_hint: "analysis",
      },
      {
        description: `Draft the main response or deliverable for: ${goalText}`,
        skill_hint: "drafting",
      },
      {
        description: `Format the final handoff into a clear checklist and summary for: ${goalText}`,
        skill_hint: "formatting",
      },
    );
  }

  const unique = subtasks.slice(0, 5);
  const hasSimple = unique.some((subtask) => classifyFromHint(subtask.skill_hint, subtask.description).tier === "simple");
  if (!hasSimple) {
    unique[unique.length - 1] = {
      description: `Format the final output into a clean checklist with next steps for: ${goalText}`,
      skill_hint: "formatting",
    };
  }

  return unique;
}

export function mockClassify(description: string, skillHint?: string): Classification {
  return classifyFromHint(skillHint ?? inferSkillHint(description), description);
}

export function mockRunSubagent(
  agent: Agent,
  model: ModelId,
  tier: string,
  taskDescription: string,
) {
  const summary = `${agent.name} produced a mock ${tier} deliverable using ${model}.`;
  const body_markdown = [
    `## Mock deliverable`,
    ``,
    `This response was generated in development fallback mode because no live LLM API key is configured.`,
    ``,
    `### Assigned specialist`,
    `- Agent: ${agent.name} (${agent.handle})`,
    `- Model tier: ${model}`,
    `- Task: ${compact(taskDescription, 220)}`,
    ``,
    `### Suggested output`,
    `1. Clarify the target outcome and acceptance criteria.`,
    `2. Produce the main deliverable in the specialist's domain.`,
    `3. Package the result into a user-owned execution record ready for Arkiv.`,
  ].join("\n");

  const output = JSON.stringify(
    {
      summary,
      body_markdown,
      next_steps: [
        "Replace MOCK_MODE with a real provider key to get live model output.",
        "Use the Arkiv receipt panel to verify the execution history flow.",
      ],
    },
    null,
    2,
  );

  const input_tokens = Math.max(120, Math.round(taskDescription.length * 0.7));
  const output_tokens = tier === "simple" ? 180 : tier === "complex" ? 720 : 420;

  return {
    output,
    input_tokens,
    output_tokens,
    actual_tokens: input_tokens + output_tokens,
  };
}