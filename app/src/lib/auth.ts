import { getSupabaseServer } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";

export type AuthUser = {
  id: string;
  email: string | null;
  github_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("github_username, display_name, avatar_url, wallet_address")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    github_username: profile?.github_username ?? null,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    wallet_address: profile?.wallet_address ?? null,
  };
}
