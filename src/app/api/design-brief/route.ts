import { NextResponse } from "next/server";
import { serverEnv } from "@/config/env";
import { estimatedCosts } from "@/config/costs";
import { ApiInputError, handleApiError, methodNotAllowed, parseJsonBody } from "@/lib/api-response";
import { buildDesignBriefPrompt } from "@/lib/design-brief-prompt";
import { normalizeDesignProfile } from "@/lib/design-profile";
import { createDemoBrief } from "@/lib/demo-data";
import {
  getOrCreateDesignSession,
  logUsageEvent,
  persistDesignImage,
  requireAuthenticatedUser
} from "@/lib/supabase-server";
import { requireRateLimit } from "@/lib/rate-limit";
import { MissingOpenAiApiKeyError, OpenAiLlmProvider } from "@/services/llm";
import type { DesignBrief, DesignProfile, GeneratedConcept } from "@/types/design";

export const runtime = "nodejs";

type DesignBriefBody = {
  designProfile?: DesignProfile;
  finalizedConcept?: GeneratedConcept;
  concepts?: GeneratedConcept[];
  referenceId?: string;
  sessionId?: string;
};

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<DesignBriefBody>(request);

    if (!body.finalizedConcept) {
      throw new ApiInputError("Please finalize a design before generating a brief.");
    }

    const referenceId = body.referenceId?.trim() || createReferenceId();
    const profile = normalizeDesignProfile(body.designProfile);
    const concepts = Array.isArray(body.concepts) ? body.concepts : [body.finalizedConcept];

    if (serverEnv.demoMode && !serverEnv.openaiApiKey) {
      return NextResponse.json({ brief: createDemoBrief(profile, body.finalizedConcept, referenceId), demoMode: true });
    }

    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimit = requireRateLimit(auth.user.id, "/api/design-brief", 10);
    if (rateLimit) return rateLimit;

    const sessionId = await getOrCreateDesignSession({
      userId: auth.user.id,
      sessionId: body.sessionId,
      designProfile: profile
    });

    const startedAt = Date.now();
    let completion;

    try {
      const provider = new OpenAiLlmProvider();
      completion = await provider.complete({
        responseFormat: "json",
        temperature: 0.25,
        messages: [
          {
            role: "system",
            content:
              "You write concise, premium diamond jewelry design briefs for workshop handoff. Return only valid JSON."
          },
          {
            role: "user",
            content: buildDesignBriefPrompt({
              profile,
              finalizedConcept: body.finalizedConcept,
              concepts,
              referenceId
            })
          }
        ]
      });
    } catch (error) {
      await logUsageEvent({
        userId: auth.user.id,
        sessionId,
        eventType: "design_brief",
        provider: "openai",
        model: serverEnv.openaiModel,
        units: 0,
        estimatedCost: estimatedCosts.openAiDesignBrief,
        status: "failed",
        latencyMs: Date.now() - startedAt,
        errorCode: "OPENAI_REQUEST_FAILED",
        metadata: { referenceId }
      });

      throw error;
    }

    const brief = normalizeBrief(JSON.parse(completion.content), referenceId, profile);
    let finalImageId: string | null = null;

    try {
      const { createAdminSupabaseClient } = await import("@/services/supabase/admin");
      const admin = createAdminSupabaseClient();
      const { data: sourceImage } = admin
        ? await admin
        .from("design_images")
        .select("storage_path")
        .eq("id", body.finalizedConcept.id)
        .eq("user_id", auth.user.id)
        .maybeSingle<{ storage_path: string | null }>()
        : { data: null };

      const finalRecord = await persistDesignImage({
        userId: auth.user.id,
        sessionId,
        concept: body.finalizedConcept,
        type: "final",
        provider: "replicate",
        storagePath: sourceImage?.storage_path ?? null
      });
      finalImageId = finalRecord.id;
      await admin
        ?.from("design_sessions")
        .update({ final_design_id: finalImageId, status: "finalized", design_profile: profile })
        .eq("id", sessionId)
        .eq("user_id", auth.user.id);
    } catch {
      finalImageId = null;
    }

    await logUsageEvent({
      userId: auth.user.id,
      sessionId,
      designImageId: finalImageId,
      eventType: "design_brief",
      provider: "openai",
      model: serverEnv.openaiModel,
      units: 0,
      estimatedCost: estimatedCosts.openAiDesignBrief,
      status: "succeeded",
      latencyMs: Date.now() - startedAt,
      metadata: { referenceId }
    });

    return NextResponse.json({ brief, sessionId });
  } catch (error) {
    if (error instanceof MissingOpenAiApiKeyError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    return handleApiError(error, "The design brief could not be generated. Please try again.");
  }
}

export function GET() {
  return methodNotAllowed();
}

function normalizeBrief(input: Partial<DesignBrief>, referenceId: string, profile: DesignProfile): DesignBrief {
  return {
    referenceId,
    sessionSummary: text(input.sessionSummary),
    customerDesignSummary: text(input.customerDesignSummary),
    jewelryType: text(input.jewelryType) || profile.jewelryType,
    occasion: text(input.occasion) || profile.occasion,
    recipient: text(input.recipient) || profile.recipient,
    style: text(input.style) || profile.style,
    metal: text(input.metal) || profile.metal,
    diamondShape: text(input.diamondShape) || profile.diamondShape,
    setting: text(input.setting) || profile.setting,
    bandStyle: text(input.bandStyle) || profile.bandStyle,
    customerNotes: Array.isArray(input.customerNotes) ? input.customerNotes.filter((note): note is string => typeof note === "string") : profile.notes,
    designEvolution: text(input.designEvolution),
    finalAiDescription: text(input.finalAiDescription),
    workshopNotes: text(input.workshopNotes),
    recommendedDiscussionPoints: Array.isArray(input.recommendedDiscussionPoints)
      ? input.recommendedDiscussionPoints.filter((point): point is string => typeof point === "string")
      : [],
    revisionHistorySummary: text(input.revisionHistorySummary),
    disclaimer:
      "This concept is intended for visual inspiration and workshop review. Final engineering and manufacturing decisions must be made by a professional jeweler."
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createReferenceId() {
  return `DIA-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
