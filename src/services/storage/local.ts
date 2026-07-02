import { StorageValidationError, type ImageStorageProvider, type StoredImage } from "./provider";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;

export class BrowserLocalImageStorage implements ImageStorageProvider {
  async store(file: File): Promise<StoredImage> {
    validateImageFile(file);

    return {
      url: await readFileAsDataUrl(file),
      fileName: file.name,
      mimeType: file.type,
      size: file.size
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
