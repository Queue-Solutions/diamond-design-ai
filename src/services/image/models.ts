export const imageModels = {
  flux2Pro: "black-forest-labs/flux-2-pro",
  gptImage2: "openai/gpt-image-2",
  nanoBanana2: "google/nano-banana-2",
  seedream5Lite: "bytedance/seedream-5-lite",
  // Legacy identifiers retained for historical records only. The active router never selects them.
  fluxKontextProEdit: "black-forest-labs/flux-kontext-pro",
  krea2Medium: "krea/krea-2-medium"
} as const;

export type ReplicateImageModel = (typeof imageModels)[keyof typeof imageModels];

export type ActiveReplicateImageModel =
  | typeof imageModels.flux2Pro
  | typeof imageModels.gptImage2
  | typeof imageModels.nanoBanana2
  | typeof imageModels.seedream5Lite;
