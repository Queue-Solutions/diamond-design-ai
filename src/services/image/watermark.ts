import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const watermarkAssetPath = join(process.cwd(), "public", "branding", "iram-watermark.png");
const watermarkWidthRatio = 0.28;
const watermarkRotation = -28;
const watermarkOpacity = 0.13;
const watermarkShadowOpacity = 0.08;
const watermarkColor = { red: 246, green: 232, blue: 219 };
const watermarkShadowColor = { red: 0, green: 0, blue: 0 };

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

  const shortestSide = Math.min(info.width, info.height);
  const watermarkWidth = Math.max(110, Math.round(shortestSide * watermarkWidthRatio));
  const [watermark, shadow] = await Promise.all([
    createDimmedWatermark(watermarkAsset, watermarkWidth, watermarkColor, watermarkOpacity),
    createDimmedWatermark(watermarkAsset, watermarkWidth, watermarkShadowColor, watermarkShadowOpacity)
  ]);
  const watermarkInfo = await sharp(watermark).metadata();
  if (!watermarkInfo.width || !watermarkInfo.height) {
    throw new ImageWatermarkError("The diagonal IRAM watermark dimensions could not be read.");
  }

  const shadowOffset = Math.max(1, Math.round(shortestSide * 0.002));
  const watermarkMark = await sharp({
    create: {
      width: watermarkInfo.width + shadowOffset,
      height: watermarkInfo.height + shadowOffset,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: shadow, left: shadowOffset, top: shadowOffset },
      { input: watermark, left: 0, top: 0 }
    ])
    .png()
    .toBuffer();
  const patternLayer = createDiagonalPatternLayer({
    imageWidth: info.width,
    imageHeight: info.height,
    watermark: watermarkMark,
    watermarkWidth: watermarkInfo.width + shadowOffset,
    watermarkHeight: watermarkInfo.height + shadowOffset
  });

  return sharp(normalizedImage)
    .composite([{ input: patternLayer }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function createDimmedWatermark(
  watermarkAsset: Buffer,
  width: number,
  color: { red: number; green: number; blue: number },
  opacity: number
) {
  const { data, info } = await sharp(watermarkAsset)
    .resize({ width, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    data[index] = color.red;
    data[index + 1] = color.green;
    data[index + 2] = color.blue;
    data[index + 3] = Math.round(data[index + 3] * opacity);
  }

  return sharp(data, { raw: info })
    .png()
    .toBuffer();
}

function createDiagonalPatternLayer({
  imageWidth,
  imageHeight,
  watermark,
  watermarkWidth,
  watermarkHeight
}: {
  imageWidth: number,
  imageHeight: number,
  watermark: Buffer,
  watermarkWidth: number,
  watermarkHeight: number
}) {
  const patternWidth = Math.round(watermarkWidth * 1.42);
  const patternHeight = Math.round(watermarkHeight * 1.38);
  const left = Math.round((patternWidth - watermarkWidth) / 2);
  const top = Math.round((patternHeight - watermarkHeight) / 2);
  const embeddedWatermark = watermark.toString("base64");

  return Buffer.from(
    `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="iram-pattern" width="${patternWidth}" height="${patternHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(${watermarkRotation})">
          <image href="data:image/png;base64,${embeddedWatermark}" x="${left}" y="${top}" width="${watermarkWidth}" height="${watermarkHeight}" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#iram-pattern)" />
    </svg>`
  );
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
