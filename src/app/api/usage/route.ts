import { NextResponse } from "next/server";
import { handleApiError, methodNotAllowed } from "@/lib/api-response";
import { getUsageSummary, requireAuthenticatedUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const usage = await getUsageSummary(auth.user.id, auth.profile);
    return NextResponse.json({ user: auth.user, profile: auth.profile, usage });
  } catch (error) {
    return handleApiError(error, "Usage could not be loaded.");
  }
}

export function POST() {
  return methodNotAllowed();
}

