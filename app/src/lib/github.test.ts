import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./http";
import { registerFromGithub } from "./github";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("registerFromGithub", () => {
  it("rejects invalid GitHub URLs", async () => {
    await expect(registerFromGithub({ github_url: "https://example.com/foo/bar" })).rejects.toMatchObject({
      code: "invalid_github_url",
    } satisfies Partial<ApiError>);
  });

  it("rejects when skills.md is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/contents/skills.md")) return Promise.resolve(jsonResponse({}, 404));
        if (url.includes("/contents/memory/metrics.json")) return Promise.resolve(jsonResponse({}, 404));
        if (url.includes("/commits?")) return Promise.resolve(jsonResponse([], 200));
        return Promise.resolve(jsonResponse({}, 500));
      }),
    );

    await expect(registerFromGithub({ github_url: "https://github.com/acme/demo-agent" })).rejects.toMatchObject({
      code: "manifest_missing_skills_md",
    } satisfies Partial<ApiError>);
  });

  it("rejects when metrics.json is malformed", async () => {
    const skillsMd = Buffer.from("- pricing\n- packaging strategy", "utf-8").toString("base64");
    const brokenMetrics = Buffer.from("{not-json}", "utf-8").toString("base64");

    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/contents/skills.md")) {
          return Promise.resolve(jsonResponse({ content: skillsMd, encoding: "base64" }));
        }
        if (url.includes("/contents/memory/metrics.json")) {
          return Promise.resolve(jsonResponse({ content: brokenMetrics, encoding: "base64" }));
        }
        if (url.includes("/commits?")) return Promise.resolve(jsonResponse([{}, {}, {}], 200));
        return Promise.resolve(jsonResponse({}, 500));
      }),
    );

    await expect(registerFromGithub({ github_url: "https://github.com/acme/pricing-bot" })).rejects.toMatchObject({
      code: "manifest_invalid_json",
    } satisfies Partial<ApiError>);
  });

  it("returns a friendly rate-limit error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/commits?")) return Promise.resolve(jsonResponse({}, 403));
        return Promise.resolve(jsonResponse({}, 404));
      }),
    );

    await expect(registerFromGithub({ github_url: "https://github.com/acme/rate-limited" })).rejects.toMatchObject({
      code: "github_rate_limited",
    } satisfies Partial<ApiError>);
  });
});