import { describe, expect, it } from "vitest";
import { buildArkivDataExplorerQueryUrl, getArkivRunQueries, PROJECT_ATTRIBUTE } from "./arkiv";

describe("arkiv query helpers", () => {
  it("builds a data explorer url from query clauses", () => {
    const url = buildArkivDataExplorerQueryUrl([
      PROJECT_ATTRIBUTE,
      { key: "runId", value: "run-123" },
      { key: "entityType", value: "execution_receipt" },
    ]);

    expect(decodeURIComponent(url)).toContain(`${PROJECT_ATTRIBUTE.key} = "${PROJECT_ATTRIBUTE.value}"`);
    expect(decodeURIComponent(url)).toContain('runId = "run-123"');
    expect(decodeURIComponent(url)).toContain('entityType = "execution_receipt"');
  });

  it("includes requester-wallet receipt queries when a wallet is provided", () => {
    const queries = getArkivRunQueries("run-456", "0xabc123");

    expect(queries).toHaveLength(4);
    expect(queries[3]?.filter).toContain('requesterWallet = "0xabc123"');
    expect(queries[3]?.filter).toContain('entityType = "execution_receipt"');
  });
});