export type StoredImage = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export interface ImageStorageProvider {
  store(file: File): Promise<StoredImage>;
  release?(url: string): void;
}

export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageValidationError";
  }
}
