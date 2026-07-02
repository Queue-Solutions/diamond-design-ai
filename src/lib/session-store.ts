"use client";

import type { ChatMessage, ConversationStage, DesignBrief, DesignProfile, GeneratedConcept } from "@/types/design";

export const diamondSessionStorageKey = "diamond-design-session-v1";

export type PersistedDiamondSession = {
  messages: ChatMessage[];
  designProfile: DesignProfile;
  stage: ConversationStage;
  suggestedActions: string[];
  generatedConcepts: GeneratedConcept[];
  selectedConceptId: string;
  finalizedConceptId: string;
  designBrief: DesignBrief | null;
  favoriteIds: string[];
  comparisonIds: string[];
  revisionUnlockedIds: string[];
  sessionId: string;
};

export function loadDiamondSession(): PersistedDiamondSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(diamondSessionStorageKey);
    return raw ? (JSON.parse(raw) as PersistedDiamondSession) : null;
  } catch {
    return null;
  }
}

export function saveDiamondSession(session: PersistedDiamondSession) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(diamondSessionStorageKey, JSON.stringify(session));
  } catch (error) {
    console.warn("Diamond session could not be saved locally.", error);
  }
}

export function clearDiamondSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(diamondSessionStorageKey);
}
