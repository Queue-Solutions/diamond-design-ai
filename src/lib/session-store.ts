"use client";

import type { ChatMessage, ConversationStage, DesignBrief, DesignProfile, GeneratedConcept } from "@/types/design";

export const diamondSessionStorageKey = "diamond-design-session-v1";
export const diamondSavedDesignsStorageKey = "diamond-saved-designs-v1";

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

export type PersistedSavedDesigns = {
  generatedConcepts: GeneratedConcept[];
  favoriteIds: string[];
  finalizedConceptId: string;
};

export function loadDiamondSession(userId?: string): PersistedDiamondSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(diamondSessionStorageKey, userId));
    return raw ? (JSON.parse(raw) as PersistedDiamondSession) : null;
  } catch {
    return null;
  }
}

export function saveDiamondSession(session: PersistedDiamondSession, userId?: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(scopedStorageKey(diamondSessionStorageKey, userId), JSON.stringify(session));
    syncSavedDesigns(session, userId);
  } catch (error) {
    console.warn("Diamond session could not be saved locally.", error);
  }
}

export function clearDiamondSession(userId?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(scopedStorageKey(diamondSessionStorageKey, userId));
}

export function loadSavedDesigns(userId?: string): PersistedSavedDesigns | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(diamondSavedDesignsStorageKey, userId));
    return raw ? (JSON.parse(raw) as PersistedSavedDesigns) : null;
  } catch {
    return null;
  }
}

export function saveSavedDesigns(savedDesigns: PersistedSavedDesigns, userId?: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(scopedStorageKey(diamondSavedDesignsStorageKey, userId), JSON.stringify(savedDesigns));
  } catch (error) {
    console.warn("Saved designs could not be saved locally.", error);
  }
}

function syncSavedDesigns(session: PersistedDiamondSession, userId?: string) {
  if (!session.generatedConcepts.length) return;

  const currentSaved = loadSavedDesigns(userId) ?? {
    generatedConcepts: [],
    favoriteIds: [],
    finalizedConceptId: ""
  };
  const sessionConceptIds = new Set(session.generatedConcepts.map((concept) => concept.id));
  const favoriteIds = new Set(session.favoriteIds);
  const concepts = new Map<string, GeneratedConcept>();

  for (const concept of currentSaved.generatedConcepts) {
    if (!sessionConceptIds.has(concept.id)) concepts.set(concept.id, concept);
  }

  for (const concept of session.generatedConcepts) {
    if (favoriteIds.has(concept.id)) concepts.set(concept.id, concept);
  }

  const nextFavoriteIds = new Set([
    ...currentSaved.favoriteIds.filter((id) => !sessionConceptIds.has(id)),
    ...session.favoriteIds
  ]);

  saveSavedDesigns({
    generatedConcepts: Array.from(concepts.values()),
    favoriteIds: Array.from(nextFavoriteIds),
    finalizedConceptId: session.finalizedConceptId || currentSaved.finalizedConceptId
  }, userId);
}

function scopedStorageKey(baseKey: string, userId?: string) {
  return `${baseKey}:${userId || "anonymous"}`;
}
