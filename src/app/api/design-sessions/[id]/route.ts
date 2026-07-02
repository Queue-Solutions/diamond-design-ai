import { NextResponse } from "next/server";
import { handleApiError, methodNotAllowed } from "@/lib/api-response";
import { mapImageRecordsToConcepts, requireAuthenticatedUser, type PersistedImageRecord } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/services/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await context.params;
    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 503 });
    }

    let sessionQuery = admin.from("design_sessions").select("*").eq("id", id);
    if (auth.profile.role !== "admin") {
      sessionQuery = sessionQuery.eq("user_id", auth.user.id);
    }

    const { data: session, error: sessionError } = await sessionQuery.maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json({ error: "Design session not found." }, { status: 404 });
    }

    let imageQuery = admin
      .from("design_images")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (auth.profile.role !== "admin") {
      imageQuery = imageQuery.eq("user_id", auth.user.id);
    }

    const { data: images, error: imagesError } = await imageQuery;
    if (imagesError) throw imagesError;

    return NextResponse.json({
      session,
      images: await mapImageRecordsToConcepts((images ?? []) as PersistedImageRecord[])
    });
  } catch (error) {
    return handleApiError(error, "The design session could not be loaded.");
  }
}

export function POST() {
  return methodNotAllowed();
}
