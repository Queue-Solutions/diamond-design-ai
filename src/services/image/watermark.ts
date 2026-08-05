import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const watermarkAssetPath = join(process.cwd(), "public", "branding", "iram-watermark.png");
const watermarkWidthRatio = 0.22;
const watermarkHeightRatio = 0.18;
const watermarkMarginRatio = 0.025;
const watermarkPaddingRatio = 0.012;

let watermarkAssetPromise: Promise<Buffer> | undefined;

export async function applyIramWatermark(imageBytes: ArrayBuffer | Buffer): Promise<Buffer> {
  const input = Buffer.isBuffer(imageBytes) ? imageBytes : Buffer.from(imageBytes);
  const { data: normalizedImage, info } = await sharp(input, { failOn: "warning" })
    .rotate()
    .png()
    .toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height) {
    throw new ImageWatermarkError("The generated image dimensions could not be read.");
  }

  const watermarkAsset = await getWatermarkAsset();
  const watermarkMetadata = await sharp(watermarkAsset).metadata();
  if (!watermarkMetadata.width || !watermarkMetadata.height) {
    throw new ImageWatermarkError("The IRAM watermark dimensions could not be read.");
  }

  const scale = Math.min(
    (info.width * watermarkWidthRatio) / watermarkMetadata.width,
    (info.height * watermarkHeightRatio) / watermarkMetadata.height
  );
  const watermarkWidth = Math.max(48, Math.round(watermarkMetadata.width * scale));
  const watermarkHeight = Math.max(42, Math.round(watermarkMetadata.height * scale));
  const shortestSide = Math.min(info.width, info.height);
  const padding = Math.max(7, Math.round(shortestSide * watermarkPaddingRatio));
  const margin = Math.max(12, Math.round(shortestSide * watermarkMarginRatio));
  const badgeWidth = watermarkWidth + padding * 2;
  const badgeHeight = watermarkHeight + padding * 2;
  const left = Math.max(0, info.width - badgeWidth - margin);
  const top = Math.max(0, info.height - badgeHeight - margin);

  const resizedWatermark = await sharp(watermarkAsset)
    .resize({ width: watermarkWidth, height: watermarkHeight, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const badge = Buffer.from(
    `<svg width="${badgeWidth}" height="${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="${badgeWidth - 1}" height="${badgeHeight - 1}" rx="${Math.max(8, Math.round(padding * 1.3))}"
        fill="rgba(5,5,5,0.34)" stroke="rgba(255,255,255,0.16)" stroke-width="1" />
    </svg>`
  );

  return sharp(normalizedImage)
    .composite([
      { input: badge, left, top },
      { input: resizedWatermark, left: left + padding, top: top + padding }
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

function getWatermarkAsset() {
  watermarkAssetPromise ??= readFile(watermarkAssetPath);
  return watermarkAssetPromise;
}

export class ImageWatermarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageWatermarkError";
  }
}
