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
      describePersonalization(profile),
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
    `Use the provided input image as the source of truth and edit that exact jewelry image: ${editInstruction}`,
    `Preserve the original ${sourceVariationName} design identity, silhouette, ring geometry, stone count, diamond shapes, setting, band structure, camera angle, crop, composition, background, and lighting`,
    "Do not redesign the ring, do not invent a new setting, do not change the center stone, side stones, halo, band shape, or camera view unless explicitly requested",
    describeProfile(designProfile),
    describePersonalization(designProfile),
    "Apply only the requested change as a localized image edit and avoid changing unrelated details",
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
    profile.personalizationText ? `personalized name or inscription text: ${profile.personalizationText}` : "",
    profile.personalizationScript ? `personalization script/language: ${profile.personalizationScript}` : "",
    profile.fontPreference ? `requested lettering/font style: ${profile.fontPreference}` : "",
    profile.notes.length ? `customer notes: ${profile.notes.join("; ")}` : ""
  ].filter(Boolean);

  return parts.join(", ");
}

function describePersonalization(profile: DesignProfile) {
  if (!profile.personalizationText && !profile.fontPreference) return "";

  const parts = [
    "personalized text jewelry request",
    profile.personalizationText
      ? `render the exact inscription text "${profile.personalizationText}" as the central jewelry lettering`
      : "",
    profile.personalizationScript ? `the inscription language/script is ${profile.personalizationScript}` : "",
    profile.fontPreference ? `use lettering inspired by the selected font style "${profile.fontPreference}"` : ""
  ].filter(Boolean);

  if (isArabicPersonalization(profile)) {
    parts.push(
      `Arabic exact-text instruction: use the precise Arabic spelling "${profile.personalizationText}"`,
      "do not translate the Arabic name",
      "do not substitute similar letters",
      "do not invent extra Arabic letters or remove diacritics if present",
      "keep the Arabic text legible as connected name jewelry lettering"
    );
  }

  parts.push(
    "the name or inscription should be integrated as wearable fine jewelry, not printed flat text",
    "avoid random unreadable letters, misspellings, placeholder glyphs, or invented words"
  );

  return parts.join(", ");
}

function isArabicPersonalization(profile: DesignProfile) {
  return /[\u0600-\u06ff]/.test(profile.personalizationText) || /arabic/i.test(profile.personalizationScript);
}
