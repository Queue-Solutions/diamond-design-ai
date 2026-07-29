import { jsPDF } from "jspdf";
import type { DesignBrief, DesignProfile, GeneratedConcept } from "@/types/design";

type DesignPdfOptions = {
  concept: GeneratedConcept;
  brief: DesignBrief;
};

const pdfArabicFontName = "NotoSansArabic";
const pdfArabicFontUrl = "/fonts/NotoSansArabic-Regular.ttf";
const pdfMargin = 48;
const pdfBottomMargin = 48;
const pdfBodyLineHeight = 13;
let pdfArabicFontLoadPromise: Promise<void> | null = null;

export async function downloadDesignPdf(options: DesignPdfOptions) {
  const pdfBlob = await createDesignPdfBlob(options);
  const link = document.createElement("a");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  link.href = pdfUrl;
  link.download = `${options.brief.referenceId}-ملخص-التصميم.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1_000);
}

export async function printDesignPdf(options: DesignPdfOptions, existingPrintWindow?: Window | null) {
  const printWindow = existingPrintWindow ?? window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Allow pop-ups to open the printable design brief.");
  }

  try {
    const pdfUrl = URL.createObjectURL(await createDesignPdfBlob(options));
    let printScheduled = false;
    const openPrintDialog = () => {
      if (printScheduled || printWindow.closed) return;
      printScheduled = true;
      window.setTimeout(() => {
        if (printWindow.closed) return;
        printWindow.focus();
        printWindow.print();
      }, 500);
    };

    printWindow.addEventListener("load", openPrintDialog, { once: true });
    printWindow.location.replace(pdfUrl);
    window.setTimeout(openPrintDialog, 1_500);
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
  } catch (error) {
    printWindow.close();
    throw error;
  }
}

export async function createDesignPdfBlob(options: DesignPdfOptions) {
  const pdf = await createDesignPdf(options);
  return pdf.output("blob");
}

async function createDesignPdf(options: DesignPdfOptions) {
  return createArabicDesignPdf(options);
}

async function createArabicDesignPdf({ concept, brief }: DesignPdfOptions) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  await loadPdfArabicFont();
  pdf.setProperties({
    title: "ملخص تصميم الألماس",
    subject: `مرجع التصميم ${brief.referenceId}`,
    creator: "وكيل تصميم الألماس"
  });

  const width = pdf.internal.pageSize.getWidth();
  const contentWidth = width - pdfMargin * 2;
  let y = pdfMargin + 22;

  paintPdfPage(pdf);
  y = writePdfLines(pdf, ["ملخص تصميم الألماس"], pdfMargin, y, contentWidth, 30, 22, [255, 255, 255], true, 700);
  y += 2;
  y = writePdfLines(
    pdf,
    [`المرجع: ${brief.referenceId}`],
    pdfMargin,
    y,
    contentWidth,
    16,
    10,
    [200, 205, 214],
    true
  );
  y += 18;

  const imageData = await imageToDataUrl(concept.url);
  const imageSize = 190;
  const imageX = width - pdfMargin - imageSize;
  if (imageData) {
    pdf.addImage(imageData, "PNG", imageX, y, imageSize, imageSize);
  }

  const profileLines = [
    ["نوع المجوهرات", brief.jewelryType || "غير محدد"],
    ["المعدن", brief.metal || "غير محدد"],
    ["شكل الألماس", brief.diamondShape || "غير محدد"],
    ["أسلوب الترصيع", brief.setting || "غير محدد"],
    ["تصميم السوار أو السلسلة", brief.bandStyle || "غير محدد"]
  ];
  const detailX = pdfMargin;
  const detailWidth = imageX - pdfMargin - 24;
  let detailY = y + 12;

  for (const [label, value] of profileLines) {
    detailY = writePdfLines(pdf, [label], detailX, detailY, detailWidth, 14, 10, [215, 196, 154], true, 700);
    const lines = splitPdfText(pdf, value || "غير محدد", detailWidth, 9.5, true);
    detailY = writePdfLines(pdf, lines, detailX, detailY, detailWidth, 12, 9.5, [245, 247, 250], true);
    detailY += 7;
  }

  y = Math.max(y + 225, detailY + 12);
  y = addArabicSection(pdf, "ملخص تصميم العميل", brief.customerDesignSummary, y);
  y = addArabicSection(pdf, "تطور التصميم", brief.designEvolution, y);
  y = addArabicSection(pdf, "الوصف النهائي بالذكاء الاصطناعي", brief.finalAiDescription, y);
  y = addArabicSection(pdf, "ملاحظات الورشة", brief.workshopNotes, y);
  y = addArabicSection(
    pdf,
    "نقاط النقاش المقترحة",
    brief.recommendedDiscussionPoints.map((point) => `- ${point}`).join("\n"),
    y
  );
  y = addArabicSection(pdf, "ملخص سجل التعديلات", brief.revisionHistorySummary, y);
  addArabicSection(pdf, "إخلاء المسؤولية", brief.disclaimer, y);

  return pdf;
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

function addArabicSection(pdf: jsPDF, title: string, text: string, y: number) {
  const width = pdf.internal.pageSize.getWidth();
  const contentWidth = width - pdfMargin * 2;
  const minimumSectionHeight = 20 + pdfBodyLineHeight * 2;

  if (remainingPdfPageHeight(pdf, y) < minimumSectionHeight) {
    y = addPdfPage(pdf) + 13;
  }

  const drawTitle = (continued = false) => {
    y = writePdfLines(
      pdf,
      [continued ? `${title} (تابع)` : title],
      pdfMargin,
      y,
      contentWidth,
      19,
      13,
      [215, 196, 154],
      true,
      700
    );
  };

  drawTitle();
  const lines = splitPdfText(pdf, text || "غير محدد", contentWidth, 10, true);
  for (const line of lines) {
    if (remainingPdfPageHeight(pdf, y) < pdfBodyLineHeight) {
      y = addPdfPage(pdf) + 13;
      drawTitle(true);
    }

    y = writePdfLines(pdf, [line], pdfMargin, y, contentWidth, pdfBodyLineHeight, 10, [235, 238, 243], true);
  }

  return y + 16;
}

function paintPdfPage(pdf: jsPDF) {
  pdf.setFillColor(8, 8, 10);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
}

function addPdfPage(pdf: jsPDF) {
  pdf.addPage();
  paintPdfPage(pdf);
  return pdfMargin;
}

function remainingPdfPageHeight(pdf: jsPDF, y: number) {
  return pdf.internal.pageSize.getHeight() - pdfBottomMargin - y;
}

function splitPdfText(pdf: jsPDF, text: string, maxWidth: number, fontSize: number, forceRtl = false): string[] {
  return text.split(/\r?\n/).flatMap((paragraph) => {
    if (!paragraph.trim()) return [""];
    if (forceRtl || containsArabic(paragraph)) {
      return wrapBrowserText(paragraph, maxWidth, fontSize);
    }
    return pdf.splitTextToSize(paragraph, maxWidth) as string[];
  });
}

function writePdfLines(
  pdf: jsPDF,
  lines: string[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number,
  color: [number, number, number],
  forceRtl = false,
  fontWeight = 400
) {
  for (const line of lines) {
    if (forceRtl || containsArabic(line)) {
      const lineCanvas = renderBrowserTextLine(line, maxWidth, lineHeight, fontSize, color, forceRtl, fontWeight);
      pdf.addImage(lineCanvas, "PNG", x, y - fontSize, maxWidth, lineHeight, undefined, "FAST");
    } else {
      pdf.text(line, x, y);
    }
    y += lineHeight;
  }
  return y;
}

function containsArabic(text: string) {
  return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/.test(text);
}

function isPredominantlyArabic(text: string) {
  const arabicCharacters = text.match(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/g)?.length ?? 0;
  const latinCharacters = text.match(/[a-z]/gi)?.length ?? 0;
  return arabicCharacters > latinCharacters;
}

function wrapBrowserText(text: string, maxWidth: number, fontSize: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return [text];

  context.font = `400 ${fontSize}px "${pdfArabicFontName}", Arial, sans-serif`;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

function renderBrowserTextLine(
  text: string,
  maxWidth: number,
  lineHeight: number,
  fontSize: number,
  color: [number, number, number],
  forceRtl = false,
  fontWeight = 400
) {
  const scale = 4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(maxWidth * scale);
  canvas.height = Math.ceil(lineHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Arabic PDF text could not be rendered.");
  }

  const isRtl = forceRtl || isPredominantlyArabic(text);
  context.scale(scale, scale);
  context.direction = isRtl ? "rtl" : "ltr";
  context.textAlign = isRtl ? "right" : "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = `rgb(${color.join(",")})`;
  context.font = `${fontWeight} ${fontSize}px "${pdfArabicFontName}", Arial, sans-serif`;
  context.fillText(text, isRtl ? maxWidth : 0, fontSize);
  return canvas;
}

async function loadPdfArabicFont() {
  if (!pdfArabicFontLoadPromise) {
    pdfArabicFontLoadPromise = (async () => {
      const font = new FontFace(pdfArabicFontName, `url(${pdfArabicFontUrl})`, {
        style: "normal",
        weight: "400"
      });
      await font.load();
      document.fonts.add(font);
      await document.fonts.load(`10px "${pdfArabicFontName}"`);
    })();
  }

  await pdfArabicFontLoadPromise;
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
