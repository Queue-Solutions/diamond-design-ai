export const imageModels = {
  flux2ProGeneration: "black-forest-labs/flux-2-pro",
  fluxKontextProEdit: "black-forest-labs/flux-kontext-pro",
  krea2Medium: "krea/krea-2-medium"
} as const;

export type ReplicateImageModel = (typeof imageModels)[keyof typeof imageModels];
