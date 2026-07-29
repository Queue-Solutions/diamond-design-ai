import type { DesignProfile, GeneratedConcept } from "@/types/design";

export function buildDesignBriefPrompt({
  profile,
  finalizedConcept,
  concepts,
  referenceId,
  language = "en"
}: {
  profile: DesignProfile;
  finalizedConcept: GeneratedConcept;
  concepts: GeneratedConcept[];
  referenceId: string;
  language?: "en" | "ar";
}) {
  const arabicOutputInstruction =
    language === "ar"
      ? `
Write every human-readable value in Arabic, including summaries, jewelry attributes, notes, discussion points, revision history, and the disclaimer.
Translate English source details into natural professional Arabic.
Keep only technical identifiers such as "${referenceId}" unchanged.
Use clear Modern Standard Arabic suitable for a jeweler and natural right-to-left reading.
The disclaimer must be exactly:
"هذا التصور مخصص للإلهام البصري والمراجعة داخل الورشة. يجب أن يتولى صائغ محترف جميع القرارات الهندسية وقرارات التصنيع النهائية."`
      : "Write every human-readable value in concise professional English.";

  return `
You are preparing a luxury diamond jewelry workshop handoff document.

This is not CAD, not 3D, not a manufacturing-ready file, and not a production guarantee.
The brief bridges AI visual inspiration and review by a professional jeweler.

Output language requirements:
${arabicOutputInstruction}

Return only valid JSON with this exact shape:
{
  "referenceId": "${referenceId}",
  "sessionSummary": "",
  "customerDesignSummary": "",
  "jewelryType": "",
  "occasion": "",
  "recipient": "",
  "style": "",
  "metal": "",
  "diamondShape": "",
  "setting": "",
  "bandStyle": "",
  "customerNotes": [],
  "designEvolution": "",
  "finalAiDescription": "",
  "workshopNotes": "",
  "recommendedDiscussionPoints": [],
  "revisionHistorySummary": "",
  "disclaimer": ""
}

Design profile:
${JSON.stringify(profile, null, 2)}

Finalized concept:
${JSON.stringify(finalizedConcept, null, 2)}

Revision history:
${JSON.stringify(
  concepts.map((concept) => ({
    version: concept.version,
    variationName: concept.variationName,
    description: concept.description,
    editInstruction: concept.editInstruction,
    parentId: concept.parentId
  })),
  null,
  2
)}
`.trim();
}
