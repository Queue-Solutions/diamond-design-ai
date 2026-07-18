import { containsArabicText } from "@/lib/personalization";
import type { DesignProfile, ImageModelPreference } from "@/types/design";
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
      "a refined luxury diamond jewelry concept with a balanced, timeless, modern, high-end boutique aesthetic"
  }
];

export function buildDiamondConceptPrompts(
  profile: DesignProfile,
  preference: ImageModelPreference = "default"
): JewelryImagePrompt[] {
  return directions.map((direction) => ({
    variationName: direction.variationName,
    description: direction.description,
    prompt: buildGenerationPrompt(profile, direction, preference)
  }));
}

export function buildEditPrompt({
  designProfile,
  editInstruction,
  sourceVariationName,
  preference = "default"
}: {
  designProfile: DesignProfile;
  editInstruction: string;
  sourceVariationName: string;
  preference?: ImageModelPreference;
}) {
  const preserved = getPreservedElements(editInstruction);
  const preservationSentence = `Keep unchanged: ${preserved.join(", ")}.`;
  const profileDetails = describeProfile(designProfile);
  const personalization = describePersonalization(designProfile);

  if (preference === "precise_changes") {
    return [
      `Use the supplied ${sourceVariationName} image as the source of truth.`,
      `Requested change:\n${editInstruction.trim()}`,
      `Must remain unchanged:\n${preserved.map((item) => `- ${item}`).join("\n")}`,
      profileDetails ? `Desired resulting design details: ${profileDetails}.` : "",
      personalization,
      "Apply only the requested change. The finished image must remain realistic luxury jewelry product photography."
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (preference === "names_lettering") {
    return [
      `Edit the supplied ${sourceVariationName} jewelry image. Requested change: ${editInstruction.trim()}.`,
      preservationSentence,
      profileDetails ? `The desired resulting jewelry is: ${profileDetails}.` : "",
      personalization,
      buildExactLetteringDirective(designProfile),
      "Return one realistic, wearable fine-jewelry product image with the original camera treatment preserved."
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (preference === "creative_exploration") {
    return [
      `Transform the supplied ${sourceVariationName} jewelry photograph according to this direction: ${editInstruction.trim()}.`,
      `Explore the requested creative direction while preserving every unaffected part of the source, including ${preserved.join(", ")}.`,
      profileDetails ? `The desired result should still follow these design details: ${profileDetails}.` : "",
      personalization,
      "Present the result as one coherent, photorealistic luxury jewelry campaign image."
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Edit the exact supplied ${sourceVariationName} jewelry photograph so the requested result is: ${editInstruction.trim()}.`,
    `Preserve the same design and photographic setup, including ${preserved.join(", ")}.`,
    profileDetails ? `The finished jewelry should positively match these details: ${profileDetails}.` : "",
    personalization,
    "Apply the change locally and keep the result realistic, wearable, refined, and suitable for premium macro product photography."
  ]
    .filter(Boolean)
    .join(" ");
}

function buildGenerationPrompt(
  profile: DesignProfile,
  direction: Direction,
  preference: ImageModelPreference
) {
  const profileDetails = describeProfile(profile);
  const personalization = describePersonalization(profile);

  if (preference === "creative_exploration") {
    return [
      `Create one imaginative but wearable photorealistic luxury jewelry concept based on ${direction.emphasis}.`,
      profileDetails ? `The design should follow these customer details: ${profileDetails}.` : "",
      personalization,
      "Photograph the finished piece in a refined high-end boutique campaign with premium studio lighting, precise reflections, crisp diamond facets, realistic metal texture, and elegant black-and-silver styling.",
      "Use a square composition with the jewelry in sharp macro focus."
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Create one ${direction.emphasis}.`,
    profileDetails ? `Design details: ${profileDetails}.` : "",
    personalization,
    preference === "names_lettering" ? buildExactLetteringDirective(profile) : "",
    "Show the finished piece as photorealistic luxury diamond jewelry product photography in a square composition.",
    "Use premium studio lighting, crisp diamond facets, precise elegant reflections, realistic metal texture, sharp macro focus, and refined black-and-silver boutique campaign styling."
  ]
    .filter(Boolean)
    .join(" ");
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

  return [
    "Integrate the personalization as wearable fine-jewelry construction rather than flat printed text.",
    profile.personalizationText
      ? `The exact authoritative inscription is "${profile.personalizationText}".`
      : "",
    profile.personalizationScript ? `The inscription script is ${profile.personalizationScript}.` : "",
    profile.fontPreference ? `Use lettering inspired by "${profile.fontPreference}".` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function buildExactLetteringDirective(profile: DesignProfile) {
  const exactText = profile.personalizationText.trim();
  if (!exactText) return "";

  const base = [
    `Render exactly "${exactText}" and repeat the authoritative inscription exactly as "${exactText}".`,
    "Do not translate, transliterate, substitute, add, remove, decorate, or duplicate any character."
  ];

  if (containsArabicText(exactText)) {
    base.push(
      "Preserve correct Arabic right-to-left order and naturally joined Arabic letterforms.",
      profile.fontPreference
        ? `Follow the selected lettering preference "${profile.fontPreference}" while keeping every Arabic character exact.`
        : "Keep the Arabic lettering legible, refined, and structurally suitable for jewelry."
    );
  }

  return base.join(" ");
}

function getPreservedElements(editInstruction: string) {
  const requested = editInstruction.toLowerCase();
  const candidates: Array<{ label: string; changesWhen: RegExp }> = [
    {
      label: "jewelry type",
      changesWhen: /\b(?:ring|necklace|pendant|bracelet|earrings?|jewelry type|turn (?:it|this) into|convert)\b/i
    },
    {
      label: "main design identity",
      changesWhen: /\b(?:redesign|reimagine|entirely new|new design identity|transform the whole)\b/i
    },
    {
      label: "pendant dimensions and proportions",
      changesWhen: /\b(?:dimension|proportion|size|length|width|scale|larger|smaller|thicker|thinner)\b/i
    },
    { label: "chain", changesWhen: /\bchain\b/i },
    {
      label: "metal",
      changesWhen: /\b(?:metal|gold|platinum|silver|rose gold|white gold|yellow gold)\b/i
    },
    {
      label: "diamonds and gemstones",
      changesWhen: /\b(?:diamond|stone|gem|halo|setting|carat|cut|shape)\b/i
    },
    {
      label: "camera angle",
      changesWhen: /\b(?:camera|angle|view|perspective|rotate|front view|side view|top view)\b/i
    },
    { label: "framing and composition", changesWhen: /\b(?:crop|framing|composition|zoom)\b/i },
    { label: "lighting", changesWhen: /\b(?:light|lighting|brightness|exposure)\b/i },
    { label: "background", changesWhen: /\b(?:background|backdrop|surface)\b/i },
    { label: "shadows", changesWhen: /\bshadow/i },
    {
      label: "luxury product-photography style",
      changesWhen: /\b(?:photography|photo style|render|illustration|sketch)\b/i
    }
  ];
  const preserved = candidates.filter((candidate) => !candidate.changesWhen.test(requested)).map((candidate) => candidate.label);

  return preserved.length ? preserved : ["all details not explicitly included in the requested change"];
}
