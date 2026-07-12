import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/services/supabase/admin";
import { createServerSupabaseClient } from "@/services/supabase/server";
import {
  createSignedImageUrl,
  refreshSignedUrlsForConcepts,
  uploadDataUrlToStorage,
  uploadImageUrlToStorage
} from "@/services/supabase/storage";
import type { DesignProfile, GeneratedConcept } from "@/types/design";

export type AuthenticatedUserContext = {
  user: {
    id: string;
    email?: string;
  };
  profile: UserProfile;
  accessToken: string;
};

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "customer" | "admin";
  daily_image_limit: number;
  monthly_image_limit: number;
  is_blocked: boolean;
};

export type UsageSummary = {
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
};

export type ReservedImageCredit = {
  usageEventId: string;
  dailyRemaining: number;
  monthlyRemaining: number;
};

export type PersistedImageRecord = {
  id: string;
  session_id: string;
  user_id: string;
  image_url: string | null;
  storage_path: string | null;
  type: "generated" | "edited" | "uploaded_reference" | "final";
  version: number;
  parent_id: string | null;
  root_id: string | null;
  variation_name: string | null;
  description: string | null;
  prompt: string | null;
  edit_instruction: string | null;
};

const imageCreditEvents = ["image_generation", "image_edit"];
const activeUsageStatuses = ["reserved", "succeeded"];

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : "";
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUserContext | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Sign in to save your designs and generate AI concepts." }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(token);
  const admin = createAdminSupabaseClient();
  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase is not configured for production persistence." }, { status: 503 });
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: "Your sign-in session expired. Please sign in again." }, { status: 401 });
  }

  let { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle<UserProfile>();

  if (!profile) {
    const { data: insertedProfile, error: insertError } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? null
      })
      .select("*")
      .single<UserProfile>();

    if (insertError || !insertedProfile) {
      return NextResponse.json({ error: "Your profile could not be prepared." }, { status: 500 });
    }

    profile = insertedProfile;
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? undefined
    },
    profile,
    accessToken: token
  };
}

export async function getUsageSummary(userId: string, profile: UserProfile): Promise<UsageSummary> {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [daily, monthly] = await Promise.all([
    admin
      .from("usage_events")
      .select("units")
      .eq("user_id", userId)
      .in("event_type", imageCreditEvents)
      .in("status", activeUsageStatuses)
      .gte("created_at", startOfDay.toISOString()),
    admin
      .from("usage_events")
      .select("units")
      .eq("user_id", userId)
      .in("event_type", imageCreditEvents)
      .in("status", activeUsageStatuses)
      .gte("created_at", startOfMonth.toISOString())
  ]);

  if (daily.error || monthly.error) {
    throw new Error("Usage could not be calculated.");
  }

  const dailyUsed = sumUnits(daily.data);
  const monthlyUsed = sumUnits(monthly.data);
  const dailyRemaining = Math.max(0, profile.daily_image_limit - dailyUsed);
  const monthlyRemaining = Math.max(0, profile.monthly_image_limit - monthlyUsed);

  return {
    dailyUsed,
    monthlyUsed,
    dailyLimit: profile.daily_image_limit,
    monthlyLimit: profile.monthly_image_limit,
    dailyRemaining,
    monthlyRemaining
  };
}

export async function requireImageCredits(context: AuthenticatedUserContext): Promise<UsageSummary | NextResponse> {
  if (context.profile.is_blocked) {
    return NextResponse.json({ error: "Your account is currently blocked from AI generation.", remainingCredits: 0 }, { status: 403 });
  }

  const usage = await getUsageSummary(context.user.id, context.profile);
  if (usage.dailyRemaining <= 0 || usage.monthlyRemaining <= 0) {
    return NextResponse.json(
      {
        error:
          usage.dailyRemaining <= 0
            ? "You've reached today's AI image limit. Please try again tomorrow."
            : "You've reached this month's AI image limit.",
        remainingCredits: 0,
        usage
      },
      { status: 429 }
    );
  }

  return usage;
}

export async function reserveImageCredit({
  userId,
  sessionId,
  eventType,
  provider,
  model,
  estimatedCost,
  metadata
}: {
  userId: string;
  sessionId: string;
  eventType: "image_generation" | "image_edit";
  provider: string;
  model: string;
  estimatedCost: number;
  metadata?: Record<string, unknown>;
}): Promise<ReservedImageCredit> {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await admin
    .rpc("consume_image_credit", {
      p_user_id: userId,
      p_session_id: sessionId,
      p_event_type: eventType,
      p_provider: provider,
      p_model: model,
      p_estimated_cost: estimatedCost,
      p_metadata: metadata ?? {}
    })
    .single<{
      usage_event_id: string;
      daily_remaining: number;
      monthly_remaining: number;
    }>();

  if (error || !data) {
    throw new UsageReservationError(mapUsageReservationMessage(error?.message), error?.message ?? "USAGE_RESERVATION_FAILED");
  }

  return {
    usageEventId: data.usage_event_id,
    dailyRemaining: data.daily_remaining,
    monthlyRemaining: data.monthly_remaining
  };
}

export async function markUsageEventSucceeded({
  usageEventId,
  designImageId,
  latencyMs,
  metadata
}: {
  usageEventId: string;
  designImageId?: string | null;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const update: Record<string, unknown> = {
    status: "succeeded",
    error_code: null
  };
  if (designImageId !== undefined) update.design_image_id = designImageId;
  if (latencyMs !== undefined) update.latency_ms = latencyMs;
  if (metadata) update.metadata = metadata;

  const { error } = await admin.from("usage_events").update(update).eq("id", usageEventId);
  if (error) {
    throw new Error("Usage event could not be marked as succeeded.");
  }
}

export async function markUsageEventFailed({
  usageEventId,
  latencyMs,
  errorCode,
  metadata
}: {
  usageEventId: string;
  latencyMs?: number;
  errorCode: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const update: Record<string, unknown> = {
    status: "failed",
    error_code: errorCode
  };
  if (latencyMs !== undefined) update.latency_ms = latencyMs;
  if (metadata) update.metadata = metadata;

  const { error } = await admin.from("usage_events").update(update).eq("id", usageEventId);
  if (error) {
    throw new Error("Usage event could not be marked as failed.");
  }
}

export async function getOrCreateDesignSession({
  userId,
  sessionId,
  designProfile,
  title
}: {
  userId: string;
  sessionId?: string;
  designProfile: DesignProfile;
  title?: string;
}) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  if (sessionId) {
    const { data } = await admin
      .from("design_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle<{ id: string }>();

    if (data?.id) {
      await admin.from("design_sessions").update({ design_profile: designProfile }).eq("id", data.id).eq("user_id", userId);
      return data.id;
    }
  }

  const { data, error } = await admin
    .from("design_sessions")
    .insert({
      user_id: userId,
      title: title || createSessionTitle(designProfile),
      design_profile: designProfile
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error("Design session could not be saved.");
  }

  return data.id;
}

export async function persistDesignImage({
  userId,
  sessionId,
  concept,
  type,
  provider,
  model,
  storagePath
}: {
  userId: string;
  sessionId: string;
  concept: GeneratedConcept;
  type: "generated" | "edited" | "uploaded_reference" | "final";
  provider?: string;
  model?: string;
  storagePath?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const parentId = await existingImageId(userId, concept.parentId);
  const rootId = await existingImageId(userId, concept.rootId);

  const { data, error } = await admin
    .from("design_images")
    .insert({
      session_id: sessionId,
      user_id: userId,
      image_url: storagePath ? null : concept.url,
      storage_path: storagePath ?? null,
      type,
      version: concept.version,
      parent_id: parentId,
      root_id: rootId,
      variation_name: concept.variationName,
      description: concept.description,
      prompt: concept.prompt,
      edit_instruction: concept.editInstruction ?? null,
      provider: provider ?? null,
      model: model ?? null,
      is_final: type === "final"
    })
    .select("*")
    .single<PersistedImageRecord>();

  if (error || !data) {
    throw new Error("Design image could not be saved.");
  }

  const id = data.id;
  if (!data.root_id) {
    await admin.from("design_images").update({ root_id: id }).eq("id", id);
    data.root_id = id;
  }

  return data;
}

export async function logUsageEvent({
  userId,
  sessionId,
  designImageId,
  eventType,
  provider,
  model,
  units,
  estimatedCost,
  status,
  latencyMs,
  errorCode,
  metadata
}: {
  userId: string;
  sessionId?: string | null;
  designImageId?: string | null;
  eventType: "chat" | "image_generation" | "image_edit" | "design_brief" | "upload";
  provider?: string;
  model?: string;
  units: number;
  estimatedCost?: number;
  status?: "reserved" | "succeeded" | "failed";
  latencyMs?: number;
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    if (units > 0) throw new Error("Supabase admin client is not configured.");
    console.warn("Non-billable usage event skipped because Supabase admin client is not configured.", { eventType });
    return;
  }

  const { error } = await admin.from("usage_events").insert({
    user_id: userId,
    session_id: sessionId ?? null,
    design_image_id: designImageId ?? null,
    event_type: eventType,
    provider: provider ?? null,
    model: model ?? null,
    units,
    estimated_cost: estimatedCost ?? 0,
    status: status ?? "succeeded",
    latency_ms: latencyMs ?? null,
    error_code: errorCode ?? null,
    metadata: metadata ?? {}
  });

  if (error) {
    if (units > 0) {
      throw new Error("Billable usage event could not be logged.");
    }

    console.warn("Non-billable usage event could not be logged.", {
      eventType,
      userId,
      message: error.message
    });
  }
}

export async function storeImageFromUrl({
  url,
  userId,
  sessionId,
  imageId
}: {
  url: string;
  userId: string;
  sessionId: string;
  imageId: string;
}) {
  const stored = await uploadImageUrlToStorage({ url, userId, sessionId, imageId, folder: "images" });
  return { signedUrl: stored.signedUrl, storagePath: stored.storagePath };
}

export async function storeImageFromDataUrl({
  dataUrl,
  userId,
  sessionId,
  imageId
}: {
  dataUrl: string;
  userId: string;
  sessionId: string;
  imageId: string;
}) {
  const stored = await uploadDataUrlToStorage({ dataUrl, userId, sessionId, imageId, folder: "uploads" });
  return { signedUrl: stored.signedUrl, storagePath: stored.storagePath };
}

export async function mapImageRecordToConcept(record: PersistedImageRecord): Promise<GeneratedConcept> {
  const signedUrl = record.storage_path ? await createSignedImageUrl(record.storage_path) : record.image_url ?? "";

  return {
    id: record.id,
    url: signedUrl,
    prompt: record.prompt ?? "",
    variationName: record.variation_name ?? "Diamond Concept",
    description: record.description ?? "",
    editInstruction: record.edit_instruction ?? undefined,
    version: record.version,
    parentId: record.parent_id,
    rootId: record.root_id ?? record.id,
    createdAt: new Date().toISOString()
  };
}

export async function mapImageRecordsToConcepts(records: PersistedImageRecord[]) {
  const concepts = records.map((record) => ({
    id: record.id,
    url: record.image_url ?? "",
    storagePath: record.storage_path,
    prompt: record.prompt ?? "",
    variationName: record.variation_name ?? "Diamond Concept",
    description: record.description ?? "",
    editInstruction: record.edit_instruction ?? undefined,
    version: record.version,
    parentId: record.parent_id,
    rootId: record.root_id ?? record.id,
    createdAt: new Date().toISOString()
  }));

  return refreshSignedUrlsForConcepts(concepts);
}

export async function getEditableImageUrlForUser(userId: string, imageId: string) {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;

  const { data } = await admin
    .from("design_images")
    .select("image_url,storage_path")
    .eq("id", imageId)
    .eq("user_id", userId)
    .maybeSingle<{ image_url: string | null; storage_path: string | null }>();

  if (!data) return null;
  if (data.storage_path) return createSignedImageUrl(data.storage_path);
  return data.image_url ?? null;
}

async function existingImageId(userId: string, id?: string | null) {
  if (!id) return null;
  const admin = createAdminSupabaseClient();
  if (!admin) return null;

  const { data } = await admin.from("design_images").select("id").eq("id", id).eq("user_id", userId).maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

function sumUnits(rows: Array<{ units: number | null }> | null) {
  return (rows ?? []).reduce((total, row) => total + (row.units ?? 0), 0);
}

function createSessionTitle(profile: DesignProfile) {
  const parts = [profile.personalizationText, profile.fontPreference, profile.style, profile.diamondShape, profile.jewelryType].filter(Boolean);
  return parts.length ? parts.join(" ") : "Diamond Design Session";
}

export class UsageReservationError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "UsageReservationError";
  }
}

function mapUsageReservationMessage(message?: string) {
  if (!message) return "Image credits could not be reserved.";
  if (message.includes("USER_BLOCKED")) return "Your account is currently blocked from AI generation.";
  if (message.includes("DAILY_IMAGE_LIMIT_EXCEEDED")) return "You've reached today's AI image limit. Please try again tomorrow.";
  if (message.includes("MONTHLY_IMAGE_LIMIT_EXCEEDED")) return "You've reached this month's AI image limit.";
  if (message.includes("PROFILE_NOT_FOUND")) return "Your profile could not be prepared.";
  return "Image credits could not be reserved.";
}
