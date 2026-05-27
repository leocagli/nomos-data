import { describe, expect, it } from "vitest";
import { mockClassify, mockDecompose, mockRunSubagent } from "./mock-llm";
import type { Agent } from "./types";

const agent: Agent = {
  id: "mock-agent",
  name: "Mock Agent",
  handle: "@mock-agent",
  description: "Test specialist",
  source: "fixture",
  skills: ["analysis", "drafting", "formatting"],
  default_tier: "moderate",
  metrics: {
    avg_tokens_per_task: { simple: 300, moderate: 900, complex: 2200 },
    tasks_completed: 10,
    tasks_attempted: 12,
    success_rate: 0.9,
  },
  skills_count: 3,
  commits_90d: 4,
  quality: 0.8,
  created_at: "2026-01-01T00:00:00Z",
};

describe("mock llm fallback", () => {
  it("creates at least three subtasks including a simple packaging step", () => {
    const subtasks = mockDecompose("Design pricing, write hero copy, and format an FAQ for launch.");
    expect(subtasks.length).toBeGreaterThanOrEqual(3);
    expect(subtasks.some((subtask) => /format/i.test(subtask.description))).toBe(true);
  });

  it("classifies formatting work as simple", () => {
    expect(mockClassify("Format the final FAQ into bullets", "formatting")).toMatchObject({
      tier: "simple",
    });
  });

  it("returns structured mock execution output", () => {
    const result = mockRunSubagent(agent, "sonnet", "moderate", "Draft the launch memo.");
    expect(result.actual_tokens).toBeGreaterThan(0);
    expect(result.output).toContain("body_markdown");
  });
});