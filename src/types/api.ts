import type { ChatApiResponse, DesignBrief, GeneratedConcept } from "./design";

export type ApiErrorPayload = {
  error: string;
  code?: string;
  demoMode?: boolean;
};

export type GenerateDesignsApiResponse = {
  images: GeneratedConcept[];
  demoMode?: boolean;
};

export type EditDesignApiResponse = {
  image: GeneratedConcept;
  updatedDesignProfile: import("./design").DesignProfile;
  demoMode?: boolean;
};

export type DesignBriefApiResponse = {
  brief: DesignBrief;
  demoMode?: boolean;
};

export type ChatConsultantApiResponse = ChatApiResponse & {
  demoMode?: boolean;
};
