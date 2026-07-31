import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { requireRateLimit } from "@/lib/rate-limit";
import {
  BonusCreditClaimError,
  claimBonusImageCredits,
  getUsageSummary,
  requireAiAccess,
  requireAuthenticatedUser
} from "@/lib/supabase-server";

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

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const accessDenied = requireAiAccess(auth);
    if (accessDenied) return accessDenied;

    const rateLimit = requireRateLimit(auth.user.id, "/api/usage/bonus", 6);
    if (rateLimit) return rateLimit;

    const usage = await claimBonusImageCredits(auth);
    return NextResponse.json({ usage, grantedCredits: 2 });
  } catch (error) {
    if (error instanceof BonusCreditClaimError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }

    return handleApiError(error, "Bonus image credits could not be granted.");
  }
}
