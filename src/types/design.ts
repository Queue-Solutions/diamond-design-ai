export type ConversationStage = "discovery" | "refinement" | "ready_to_generate";

export type DesignProfile = {
  jewelryType: string;
  occasion: string;
  recipient: string;
  style: string;
  metal: string;
  diamondShape: string;
  setting: string;
  bandStyle: string;
  budgetRange: string;
  notes: string[];
  readyForGeneration: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ChatApiRequest = {
  messages: ChatMessage[];
  designProfile: DesignProfile;
};

export type ChatApiResponse = {
  assistantMessage: string;
  updatedDesignProfile: DesignProfile;
  stage: ConversationStage;
  suggestedActions: string[];
};

export type GeneratedConcept = {
  id: string;
  url: string;
  prompt: string;
  variationName: string;
  description: string;
  editInstruction?: string;
  version: number;
  parentId: string | null;
  rootId: string;
  createdAt: string;
};

export type DesignBrief = {
  referenceId: string;
  sessionSummary: string;
  customerDesignSummary: string;
  jewelryType: string;
  occasion: string;
  recipient: string;
  style: string;
  metal: string;
  diamondShape: string;
  setting: string;
  bandStyle: string;
  customerNotes: string[];
  designEvolution: string;
  finalAiDescription: string;
  workshopNotes: string;
  recommendedDiscussionPoints: string[];
  revisionHistorySummary: string;
  disclaimer: string;
};

export const emptyDesignProfile: DesignProfile = {
  jewelryType: "",
  occasion: "",
  recipient: "",
  style: "",
  metal: "",
  diamondShape: "",
  setting: "",
  bandStyle: "",
  budgetRange: "",
  notes: [],
  readyForGeneration: false
};
