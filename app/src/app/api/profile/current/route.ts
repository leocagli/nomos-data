import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({
    success: true,
    data: {
      wallet_address: user?.wallet_address ?? null,
    },
  });
}
