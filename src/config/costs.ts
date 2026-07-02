function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const estimatedCosts = {
  replicateFlux2ProGeneration: numberFromEnv("ESTIMATED_COST_REPLICATE_FLUX_2_PRO_IMAGE", 0.04),
  replicateFluxKontextProEdit: numberFromEnv("ESTIMATED_COST_REPLICATE_FLUX_KONTEXT_PRO_EDIT", 0.04),
  openAiChat: numberFromEnv("ESTIMATED_COST_OPENAI_CHAT", 0.01),
  openAiDesignBrief: numberFromEnv("ESTIMATED_COST_OPENAI_DESIGN_BRIEF", 0.02)
};

