import { NextResponse } from "next/server";
import { ApiInputError, handleApiError, methodNotAllowed, parseJsonBody } from "@/lib/api-response";
import {
  getOrCreateDesignSession,
  logUsageEvent,
  mapImageRecordToConcept,
  persistDesignImage,
  requireAuthenticatedUser,
  storeImageFromDataUrl
} from "@/lib/supabase-server";
import { StorageImageError } from "@/services/supabase/storage";
import type { DesignProfile, GeneratedConcept } from "@/types/design";

export const runtime = "nodejs";

type DesignImageBody = {
  sessionId?: string;
  designProfile?: DesignProfile;
  concept?: GeneratedConcept;
  type?: "uploaded_reference";
};

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await parseJsonBody<DesignImageBody>(request);
    if (!body.concept || body.type !== "uploaded_reference") {
      throw new ApiInputError("A valid uploaded reference image is required.");
    }

    const sessionId = await getOrCreateDesignSession({
      userId: auth.user.id,
      sessionId: body.sessionId,
      designProfile: body.designProfile ?? {
        jewelryType: "",
        occasion: "",
        recipient: "",
        style: "",
        metal: "",
        diamondShape: "",
        setting: "",
        bandStyle: "",
        budgetRange: "",
        personalizationText: "",
        personalizationScript: "",
        fontPreference: "",
        notes: [],
        readyForGeneration: false
      }
    });
    const stored = await storeImageFromDataUrl({
      dataUrl: body.concept.url,
      userId: auth.user.id,
      sessionId,
      imageId: body.concept.id
    });
    const record = await persistDesignImage({
      userId: auth.user.id,
      sessionId,
      concept: { ...body.concept, url: stored.signedUrl },
      type: "uploaded_reference",
      storagePath: stored.storagePath
    });

    await logUsageEvent({
      userId: auth.user.id,
      sessionId,
      designImageId: record.id,
      eventType: "upload",
      units: 0,
      metadata: { storage: stored.storagePath ? "supabase-storage" : "browser-local-data-url" }
    });

    return NextResponse.json({ image: await mapImageRecordToConcept(record), sessionId });
  } catch (error) {
    if (error instanceof StorageImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return handleApiError(error, "The uploaded reference could not be saved.");
  }
}

export function GET() {
  return methodNotAllowed();
}
