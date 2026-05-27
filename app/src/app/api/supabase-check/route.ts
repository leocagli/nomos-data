import { NextResponse } from "next/server";
import { getArkivCreatorAddress, isArkivWriteEnabled } from "@/lib/arkiv";
import { LLM_MOCK_MODE, MOCK_MODE } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  const arkivWriteEnabled = isArkivWriteEnabled();

  try {
    if (!supabaseConfigured) {
      return NextResponse.json({
        ok: false,
        can_query: false,
        profile_count: 0,
        error: "Supabase is not configured.",
        config: {
          supabase: {
            configured: false,
          },
          anthropic: {
            configured: Boolean(process.env.ANTHROPIC_API_KEY),
            llm_mock_mode: LLM_MOCK_MODE,
            mock_mode_forced: MOCK_MODE,
          },
          arkiv: {
            write_enabled: arkivWriteEnabled,
            creator_address: getArkivCreatorAddress() ?? null,
          },
          site: {
            url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
            node_env: process.env.NODE_ENV ?? null,
          },
        },
      });
    }

    const supabase = await getSupabaseServer();
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({
        ok: false,
        can_query: false,
        profile_count: 0,
        error: error.message,
        config: {
          supabase: {
            configured: true,
          },
          anthropic: {
            configured: Boolean(process.env.ANTHROPIC_API_KEY),
            llm_mock_mode: LLM_MOCK_MODE,
            mock_mode_forced: MOCK_MODE,
          },
          arkiv: {
            write_enabled: arkivWriteEnabled,
            creator_address: getArkivCreatorAddress() ?? null,
          },
          site: {
            url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
            node_env: process.env.NODE_ENV ?? null,
          },
        },
      });
    }

    return NextResponse.json({
      ok: true,
      can_query: true,
      profile_count: count ?? 0,
      error: null,
      config: {
        supabase: {
          configured: true,
        },
        anthropic: {
          configured: Boolean(process.env.ANTHROPIC_API_KEY),
          llm_mock_mode: LLM_MOCK_MODE,
          mock_mode_forced: MOCK_MODE,
        },
        arkiv: {
          write_enabled: arkivWriteEnabled,
          creator_address: getArkivCreatorAddress() ?? null,
        },
        site: {
          url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
          node_env: process.env.NODE_ENV ?? null,
        },
      },
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      can_query: false,
      profile_count: 0,
      error: e instanceof Error ? e.message : "unknown error",
      config: {
        supabase: {
          configured: supabaseConfigured,
        },
        anthropic: {
          configured: Boolean(process.env.ANTHROPIC_API_KEY),
          llm_mock_mode: LLM_MOCK_MODE,
          mock_mode_forced: MOCK_MODE,
        },
        arkiv: {
          write_enabled: arkivWriteEnabled,
          creator_address: getArkivCreatorAddress() ?? null,
        },
        site: {
          url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
          node_env: process.env.NODE_ENV ?? null,
        },
      },
    });
  }
}
