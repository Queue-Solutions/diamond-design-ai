import { jsPDF } from "jspdf";
import type { DesignBrief, DesignProfile, GeneratedConcept } from "@/types/design";

export async function downloadDesignPdf({
  concept,
  brief,
  profile
}: {
  concept: GeneratedConcept;
  brief: DesignBrief;
  profile: DesignProfile;
}) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = pdf.internal.pageSize.getWidth();
  let y = 48;

  pdf.setFillColor(8, 8, 10);
  pdf.rect(0, 0, width, pdf.internal.pageSize.getHeight(), "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("Diamond Design Brief", margin, y);
  y += 24;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(200, 205, 214);
  pdf.text(`Reference ${brief.referenceId}`, margin, y);
  y += 28;

  const imageData = await imageToDataUrl(concept.url);
  if (imageData) {
    pdf.addImage(imageData, "PNG", margin, y, 190, 190);
  }

  const profileLines = [
    ["Jewelry Type", brief.jewelryType || profile.jewelryType],
    ["Metal", brief.metal || profile.metal],
    ["Diamond Shape", brief.diamondShape || profile.diamondShape],
    ["Setting", brief.setting || profile.setting],
    ["Band Style", brief.bandStyle || profile.bandStyle],
    ["Version", `V${concept.version}`]
  ];

  let detailY = y + 12;
  for (const [label, value] of profileLines) {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(215, 196, 154);
    pdf.text(label, margin + 220, detailY);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(245, 247, 250);
    pdf.text(value || "Not specified", margin + 220, detailY + 14);
    detailY += 34;
  }

  y += 225;
  y = addSection(pdf, "Customer Design Summary", brief.customerDesignSummary, margin, y, width);
  y = addSection(pdf, "Design Evolution", brief.designEvolution, margin, y, width);
  y = addSection(pdf, "Final AI Description", brief.finalAiDescription, margin, y, width);
  y = addSection(pdf, "Workshop Notes", brief.workshopNotes, margin, y, width);
  y = addSection(pdf, "Recommended Discussion Points", brief.recommendedDiscussionPoints.join("\n"), margin, y, width);
  y = addSection(pdf, "Revision History Summary", brief.revisionHistorySummary, margin, y, width);
  addSection(pdf, "Disclaimer", brief.disclaimer, margin, y, width);

  pdf.save(`${brief.referenceId}-design-brief.pdf`);
}

export async function downloadWorkshopPng({
  concept,
  brief,
  profile
}: {
  concept: GeneratedConcept;
  brief: DesignBrief;
  profile: DesignProfile;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 1800;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PNG export is not available in this browser.");

  context.fillStyle = "#08080a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.font = "700 56px Arial";
  context.fillText("Workshop Handoff Card", 90, 110);
  context.fillStyle = "#c9d3df";
  context.font = "28px Arial";
  context.fillText(`Reference ${brief.referenceId}`, 90, 155);

  const image = await loadImage(concept.url);
  if (image) {
    context.drawImage(image, 90, 220, 620, 620);
  }

  context.fillStyle = "#d7c49a";
  context.font = "700 30px Arial";
  context.fillText(`V${concept.version} - ${concept.variationName}`, 760, 260);

  context.fillStyle = "#ffffff";
  context.font = "24px Arial";
  const rows = [
    ["Jewelry", brief.jewelryType || profile.jewelryType],
    ["Metal", brief.metal || profile.metal],
    ["Stone", brief.diamondShape || profile.diamondShape],
    ["Setting", brief.setting || profile.setting],
    ["Style", brief.style || profile.style],
    ["Date", new Date().toLocaleDateString()]
  ];
  let y = 330;
  for (const [label, value] of rows) {
    context.fillStyle = "#8f98a6";
    context.fillText(label, 760, y);
    context.fillStyle = "#ffffff";
    context.fillText(value || "Not specified", 760, y + 34);
    y += 86;
  }

  drawWrappedText(context, brief.sessionSummary || brief.customerDesignSummary, 90, 930, 1220, 34);
  context.fillStyle = "#8f98a6";
  context.font = "22px Arial";
  drawWrappedText(context, brief.disclaimer, 90, 1640, 1220, 30);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${brief.referenceId}-workshop-card.png`;
  link.click();
}

export function createBriefText(brief: DesignBrief, concept: GeneratedConcept) {
  return [
    `Reference: ${brief.referenceId}`,
    `Final Design: V${concept.version} - ${concept.variationName}`,
    "",
    "Customer Design Summary",
    brief.customerDesignSummary,
    "",
    "Workshop Notes",
    brief.workshopNotes,
    "",
    "Recommended Discussion Points",
    brief.recommendedDiscussionPoints.map((point) => `- ${point}`).join("\n"),
    "",
    "Disclaimer",
    brief.disclaimer
  ].join("\n");
}

function addSection(pdf: jsPDF, title: string, text: string, margin: number, y: number, width: number) {
  if (y > 720) {
    pdf.addPage();
    pdf.setFillColor(8, 8, 10);
    pdf.rect(0, 0, width, pdf.internal.pageSize.getHeight(), "F");
    y = 48;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(215, 196, 154);
  pdf.text(title, margin, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(235, 238, 243);
  const lines = pdf.splitTextToSize(text || "Not specified", width - margin * 2);
  pdf.text(lines, margin, y);
  return y + lines.length * 13 + 22;
}

async function imageToDataUrl(url: string) {
  const image = await loadImage(url);
  if (!image) return "";
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(image, 0, 0, 600, 600);
  return canvas.toDataURL("image/png");
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  context.fillStyle = "#ffffff";
  context.font = "26px Arial";
  const words = (text || "Not specified").split(" ");
  let line = "";
  for (const word of words) {
    const testLine = `${line}${word} `;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
}
