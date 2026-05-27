import { NextResponse } from "next/server";
import { fetchRunLedgerFromArkiv } from "@/lib/arkiv";
import { jsonError, requireTrimmedString } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const runId = requireTrimmedString(id, "id", { maxLength: 200 });
    const { searchParams } = new URL(request.url);
    const requesterWallet = searchParams.get("requesterWallet")?.trim() || undefined;

    const data = await fetchRunLedgerFromArkiv(runId, requesterWallet);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return jsonError(error, {
      status: 500,
      code: "arkiv_query_failed",
      message: "unable to query Arkiv run ledger",
    });
  }
}