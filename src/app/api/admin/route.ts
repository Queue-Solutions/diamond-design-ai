import { NextResponse } from "next/server";
import { ApiInputError, handleApiError, parseJsonBody } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/services/supabase/admin";

export const runtime = "nodejs";

type AdminPatchBody = {
  userId?: string;
  isBlocked?: boolean;
  dailyImageLimit?: number;
  monthlyImageLimit?: number;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 503 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [profiles, todayEvents, blockedUsers] = await Promise.all([
      admin.from("profiles").select("id,email,full_name,role,daily_image_limit,monthly_image_limit,is_blocked,created_at"),
      admin
        .from("usage_events")
        .select("user_id,event_type,units,estimated_cost,status,latency_ms,profiles(email)")
        .gte("created_at", startOfDay.toISOString())
        .in("event_type", ["image_generation", "image_edit"]),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_blocked", true)
    ]);

    if (profiles.error || todayEvents.error || blockedUsers.error) {
      throw new Error("Admin metrics could not be loaded.");
    }

    const events = todayEvents.data ?? [];
    const topUsersMap = new Map<string, { userId: string; email: string; imageUsage: number }>();
    for (const event of events as Array<{ user_id: string; units: number | null; profiles?: { email?: string | null } | null }>) {
      const current = topUsersMap.get(event.user_id) ?? {
        userId: event.user_id,
        email: event.profiles?.email ?? "Unknown",
        imageUsage: 0
      };
      current.imageUsage += event.units ?? 0;
      topUsersMap.set(event.user_id, current);
    }

    return NextResponse.json({
      totalUsers: profiles.data?.length ?? 0,
      successfulImageGenerationsToday: countUsage(events, "image_generation", "succeeded"),
      failedImageGenerationsToday: countUsage(events, "image_generation", "failed"),
      reservedImageGenerationsToday: countUsage(events, "image_generation", "reserved"),
      successfulImageEditsToday: countUsage(events, "image_edit", "succeeded"),
      failedImageEditsToday: countUsage(events, "image_edit", "failed"),
      reservedImageEditsToday: countUsage(events, "image_edit", "reserved"),
      imagesGeneratedToday: countUsage(events, "image_generation", "succeeded"),
      imagesEditedToday: countUsage(events, "image_edit", "succeeded"),
      estimatedUsageCostToday: events.reduce((total, event) => total + Number(event.estimated_cost ?? 0), 0),
      averageLatencyMsToday: averageLatency(events),
      blockedUsersCount: blockedUsers.count ?? 0,
      topUsersByImageUsage: Array.from(topUsersMap.values())
        .sort((a, b) => b.imageUsage - a.imageUsage)
        .slice(0, 5),
      users: profiles.data ?? []
    });
  } catch (error) {
    return handleApiError(error, "Admin metrics could not be loaded.");
  }
}

function countUsage(events: Array<{ event_type: string; status?: string | null; units: number | null }>, eventType: string, status: string) {
  return events
    .filter((event) => event.event_type === eventType && event.status === status)
    .reduce((total, event) => total + (event.units ?? 0), 0);
}

function averageLatency(events: Array<{ latency_ms?: number | null }>) {
  const latencies = events
    .map((event) => event.latency_ms)
    .filter((latency): latency is number => typeof latency === "number" && Number.isFinite(latency));

  if (!latencies.length) return null;
  return Math.round(latencies.reduce((total, latency) => total + latency, 0) / latencies.length);
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await parseJsonBody<AdminPatchBody>(request);
    if (!body.userId) {
      throw new ApiInputError("User ID is required.");
    }

    const updates: Record<string, number | boolean> = {};
    if (typeof body.isBlocked === "boolean") updates.is_blocked = body.isBlocked;
    if (Number.isInteger(body.dailyImageLimit) && body.dailyImageLimit! >= 0) updates.daily_image_limit = body.dailyImageLimit!;
    if (Number.isInteger(body.monthlyImageLimit) && body.monthlyImageLimit! >= 0) updates.monthly_image_limit = body.monthlyImageLimit!;

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 503 });
    }

    const { error } = await admin.from("profiles").update(updates).eq("id", body.userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "The user limits could not be updated.");
  }
}
