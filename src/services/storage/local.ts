import { StorageValidationError, type ImageStorageProvider, type StoredImage } from "./provider";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;

export class BrowserLocalImageStorage implements ImageStorageProvider {
  async store(file: File): Promise<StoredImage> {
    validateImageFile(file);
    const optimized = await optimizeImageForUpload(file);

    return {
      url: optimized.url,
      fileName: file.name,
      mimeType: optimized.mimeType,
      size: optimized.size
    };
  }
}

export function validateImageFile(file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new StorageValidationError("Please upload a PNG, JPG, JPEG, or WEBP image.");
  }

  if (file.size > maxFileSize) {
    throw new StorageValidationError("Please upload an image smaller than 10MB.");
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new StorageValidationError("The selected image could not be read."));
      }
    };
    reader.onerror = () => reject(new StorageValidationError("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
}

async function optimizeImageForUpload(file: File) {
  const originalUrl = await readFileAsDataUrl(file);

  try {
    const image = await loadImage(originalUrl);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new StorageValidationError("The selected image could not be prepared.");

    context.drawImage(image, 0, 0, width, height);
    const url = canvas.toDataURL("image/webp", 0.9);
    return {
      url,
      mimeType: "image/webp",
      size: dataUrlSize(url)
    };
  } catch {
    return {
      url: originalUrl,
      mimeType: file.type,
      size: file.size
    };
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new StorageValidationError("The selected image could not be loaded."));
    image.src = url;
  });
}

function dataUrlSize(dataUrl: string) {
  const encoded = dataUrl.split(",")[1] ?? "";
  return Math.floor((encoded.length * 3) / 4);
}
