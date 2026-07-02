import { NextResponse } from "next/server";
import { serverEnv } from "@/config/env";
import { estimatedCosts } from "@/config/costs";
import { ApiInputError, handleApiError, methodNotAllowed, parseJsonBody } from "@/lib/api-response";
import { diamondConsultantSystemPrompt } from "@/lib/diamond-consultant-prompt";
import { normalizeDesignProfile, normalizeStage } from "@/lib/design-profile";
import { requireRateLimit } from "@/lib/rate-limit";
import { logUsageEvent, requireAuthenticatedUser } from "@/lib/supabase-server";
import { MissingOpenAiApiKeyError, OpenAiLlmProvider } from "@/services/llm";
import type { ChatApiRequest, ChatApiResponse, ChatMessage } from "@/types/design";

export const runtime = "nodejs";

type ConsultantModelResponse = Partial<ChatApiResponse>;

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<Partial<ChatApiRequest>>(request);
    const messages = normalizeMessages(body.messages);
    const designProfile = normalizeDesignProfile(body.designProfile);

    if (messages.length === 0) {
      throw new ApiInputError("Please send a message to begin the consultation.");
    }

    if (serverEnv.demoMode && !serverEnv.openaiApiKey) {
      return NextResponse.json(createDemoChatResponse(body.designProfile));
    }

    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimit = requireRateLimit(auth.user.id, "/api/chat", 30);
    if (rateLimit) return rateLimit;

    const startedAt = Date.now();
    let completion;

    try {
      const provider = new OpenAiLlmProvider();
      completion = await provider.complete({
        responseFormat: "json",
        temperature: 0.35,
        messages: [
          { role: "system", content: diamondConsultantSystemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "Continue the consultation from these messages. Update the design profile without exposing JSON to the customer.",
              currentDesignProfile: designProfile,
              messages: messages.map(({ role, content }) => ({ role, content }))
            })
          }
        ]
      });
    } catch (error) {
      await logUsageEvent({
        userId: auth.user.id,
        eventType: "chat",
        provider: "openai",
        model: serverEnv.openaiModel,
        units: 0,
        estimatedCost: estimatedCosts.openAiChat,
        status: "failed",
        latencyMs: Date.now() - startedAt,
        errorCode: "OPENAI_REQUEST_FAILED",
        metadata: { messageCount: messages.length }
      });

      throw error;
    }

    const parsed = parseModelResponse(completion.content);
    const updatedDesignProfile = normalizeDesignProfile(parsed.updatedDesignProfile);
    const stage = normalizeStage(parsed.stage, updatedDesignProfile);
    await logUsageEvent({
      userId: auth.user.id,
      eventType: "chat",
      provider: "openai",
      model: serverEnv.openaiModel,
      units: 0,
      estimatedCost: estimatedCosts.openAiChat,
      status: "succeeded",
      latencyMs: Date.now() - startedAt,
      metadata: { messageCount: messages.length }
    });

    return NextResponse.json({
      assistantMessage:
        typeof parsed.assistantMessage === "string" && parsed.assistantMessage.trim()
          ? parsed.assistantMessage.trim()
          : fallbackAssistantMessage(stage),
      updatedDesignProfile,
      stage,
      suggestedActions: normalizeSuggestedActions(parsed.suggestedActions)
    } satisfies ChatApiResponse);
  } catch (error) {
    if (error instanceof MissingOpenAiApiKeyError) {
      return NextResponse.json(
        {
          error: error.message
        },
        { status: 503 }
      );
    }

    return handleApiError(error, "The consultation could not continue. Please try again.");
  }
}

export function GET() {
  return methodNotAllowed();
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter(
      (message): message is ChatMessage =>
        typeof message === "object" &&
        message !== null &&
        (message as ChatMessage).role !== undefined &&
        ((message as ChatMessage).role === "user" || (message as ChatMessage).role === "assistant") &&
        typeof (message as ChatMessage).content === "string"
    )
    .slice(-12);
}

function parseModelResponse(content: string): ConsultantModelResponse {
  try {
    return JSON.parse(content) as ConsultantModelResponse;
  } catch {
    return {
      assistantMessage: content,
      suggestedActions: ["Make it modern", "I prefer white gold", "Show me classic elegance"]
    };
  }
}

function normalizeSuggestedActions(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return ["Make it modern", "I prefer white gold", "I want an oval diamond"];
  }

  const blocked = ["ask customer", "clarify", "after ", "next ", "should ", "need to", "determine", "collect"];

  const actions = input
    .filter((action): action is string => typeof action === "string")
    .map((action) => action.trim())
    .filter((action) => action.length > 0 && action.length <= 36)
    .filter((action) => !blocked.some((phrase) => action.toLowerCase().includes(phrase)))
    .slice(0, 4);

  return actions.length ? actions : ["I prefer solitaire", "Show halo options", "Make it more vintage", "Use yellow gold"];
}

function fallbackAssistantMessage(stage: ChatApiResponse["stage"]) {
  if (stage === "ready_to_generate") {
    return "I have enough direction to create your first diamond design concept. In the next step, I can generate a visual direction for you.";
  }

  return "Tell me a little more about the piece you imagine, and I will shape the direction with you.";
}

function createDemoChatResponse(profileInput: unknown): ChatApiResponse {
  const profile = normalizeDesignProfile(profileInput);
  const updatedDesignProfile = normalizeDesignProfile({
    ...profile,
    jewelryType: profile.jewelryType || "Ring",
    occasion: profile.occasion || "Client consultation",
    style: profile.style || "Modern luxury",
    metal: profile.metal || "White Gold",
    diamondShape: profile.diamondShape || "Oval",
    setting: profile.setting || "Hidden Halo",
    bandStyle: profile.bandStyle || "Thin Band",
    notes: [...profile.notes, "Demo mode placeholder response"],
    readyForGeneration: true
  });

  return {
    assistantMessage:
      "Demo mode is active because OpenAI is not configured. I have prepared a sample luxury diamond direction so you can continue the presentation safely.",
    updatedDesignProfile,
    stage: "ready_to_generate",
    suggestedActions: ["Generate demo concepts", "Make it more minimal", "Change to rose gold"]
  };
}
