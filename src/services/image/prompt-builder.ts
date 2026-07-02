import type { DesignProfile } from "@/types/design";
import type { JewelryImagePrompt } from "./provider";

type Direction = {
  variationName: string;
  description: string;
  emphasis: string;
};

const directions: Direction[] = [
  {
    variationName: "Luxury Concept",
    description: "A refined premium diamond concept shaped from the customer's selected direction.",
    emphasis:
      "luxury diamond jewelry, refined premium composition, balanced timeless and modern details, high-end boutique aesthetic"
  }
];

export function buildDiamondConceptPrompts(profile: DesignProfile): JewelryImagePrompt[] {
  return directions.map((direction) => ({
    variationName: direction.variationName,
    description: direction.description,
    prompt: [
      direction.emphasis,
      describeProfile(profile),
      "photorealistic luxury diamond jewelry product photography",
      "macro product photography, premium studio lighting, crisp diamond facets, precise reflections",
      "elegant composition, high-end jewelry boutique campaign, refined black and silver luxury styling",
      "sharp focus, ultra detailed, realistic metal texture, realistic diamond fire and scintillation",
      "no cartoon, no illustration, no CAD, no technical drawing, no manufacturing diagram, no low quality render"
    ]
      .filter(Boolean)
      .join(", ")
  }));
}

export function buildEditPrompt({
  designProfile,
  editInstruction,
  sourceVariationName
}: {
  designProfile: DesignProfile;
  editInstruction: string;
  sourceVariationName: string;
}) {
  return [
    `Edit this luxury diamond jewelry product photograph: ${editInstruction}`,
    `Preserve the original ${sourceVariationName} design identity, overall silhouette, camera angle, composition, lighting, and premium studio product photography style where possible`,
    describeProfile(designProfile),
    "Apply only the requested change and avoid changing unrelated details",
    "Keep the jewelry realistic, wearable, premium, and diamond-focused",
    "maintain crisp diamond facets, realistic metal texture, elegant reflections, macro luxury boutique photography",
    "no cartoon, no illustration, no sketch, no CAD, no technical drawing, no unrealistic fantasy output"
  ]
    .filter(Boolean)
    .join(", ");
}

function describeProfile(profile: DesignProfile) {
  const parts = [
    profile.jewelryType ? `jewelry type: ${profile.jewelryType}` : "",
    profile.occasion ? `occasion: ${profile.occasion}` : "",
    profile.recipient ? `recipient: ${profile.recipient}` : "",
    profile.style ? `customer style preference: ${profile.style}` : "",
    profile.metal ? `metal: ${profile.metal}` : "",
    profile.diamondShape ? `center diamond shape: ${profile.diamondShape}` : "",
    profile.setting ? `setting: ${profile.setting}` : "",
    profile.bandStyle ? `band style: ${profile.bandStyle}` : "",
    profile.budgetRange ? `budget character: ${profile.budgetRange}` : "",
    profile.notes.length ? `customer notes: ${profile.notes.join("; ")}` : ""
  ].filter(Boolean);

  return parts.join(", ");
}
