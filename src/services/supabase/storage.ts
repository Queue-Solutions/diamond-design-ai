import { createAdminSupabaseClient } from "./admin";
import type { GeneratedConcept } from "@/types/design";

const designImagesBucket = "design-images";
const signedUrlExpiresInSeconds = 60 * 60;
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export type StoredPrivateImage = {
  storagePath: string;
  signedUrl: string;
};

export type StorageFolder = "images" | "uploads" | "exports";

export function buildImageStoragePath({
  userId,
  sessionId,
  imageId,
  folder
}: {
  userId: string;
  sessionId: string;
  imageId: string;
  folder: StorageFolder;
}) {
  return `users/${userId}/sessions/${sessionId}/${folder}/${imageId}.png`;
}

export async function uploadImageToStorage({
  bytes,
  contentType,
  storagePath
}: {
  bytes: ArrayBuffer | Buffer;
  contentType: string;
  storagePath: string;
}): Promise<StoredPrivateImage> {
  if (!allowedImageTypes.has(contentType)) {
    throw new StorageImageError("Only PNG, JPG, JPEG, or WEBP images can be stored.");
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    throw new StorageImageError("Supabase Storage is not configured.");
  }

  const { error } = await admin.storage.from(designImagesBucket).upload(storagePath, bytes, {
    contentType,
    upsert: true
  });

  if (error) {
    throw new StorageImageError("The image could not be stored privately.");
  }

  return {
    storagePath,
    signedUrl: await createSignedImageUrl(storagePath)
  };
}

export async function uploadImageUrlToStorage({
  url,
  userId,
  sessionId,
  imageId,
  folder = "images"
}: {
  url: string;
  userId: string;
  sessionId: string;
  imageId: string;
  folder?: StorageFolder;
}) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new StorageImageError("The generated image could not be downloaded for private storage.");
  }

  const contentType = normalizeImageContentType(response.headers.get("content-type"));
  const bytes = await response.arrayBuffer();

  return uploadImageToStorage({
    bytes,
    contentType,
    storagePath: buildImageStoragePath({ userId, sessionId, imageId, folder })
  });
}

export async function uploadDataUrlToStorage({
  dataUrl,
  userId,
  sessionId,
  imageId,
  folder = "uploads"
}: {
  dataUrl: string;
  userId: string;
  sessionId: string;
  imageId: string;
  folder?: StorageFolder;
}) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new StorageImageError("A valid PNG, JPG, JPEG, or WEBP image is required.");
  }

  const [, contentType, encoded] = match;
  return uploadImageToStorage({
    bytes: Buffer.from(encoded.replace(/\s/g, ""), "base64"),
    contentType: normalizeImageContentType(contentType),
    storagePath: buildImageStoragePath({ userId, sessionId, imageId, folder })
  });
}

export async function createSignedImageUrl(storagePath: string, expiresIn = signedUrlExpiresInSeconds) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    throw new StorageImageError("Supabase Storage is not configured.");
  }

  const { data, error } = await admin.storage.from(designImagesBucket).createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) {
    throw new StorageImageError("A signed image URL could not be created.");
  }

  return data.signedUrl;
}

export async function createSignedImageUrls(storagePaths: string[], expiresIn = signedUrlExpiresInSeconds) {
  const uniquePaths = Array.from(new Set(storagePaths.filter(Boolean)));
  const entries = await Promise.all(
    uniquePaths.map(async (storagePath) => [storagePath, await createSignedImageUrl(storagePath, expiresIn)] as const)
  );

  return new Map(entries);
}

export async function refreshSignedUrlsForConcepts<T extends GeneratedConcept & { storagePath?: string | null }>(
  concepts: T[]
): Promise<GeneratedConcept[]> {
  const signedUrls = await createSignedImageUrls(
    concepts.map((concept) => concept.storagePath).filter((path): path is string => Boolean(path))
  );

  return concepts.map(({ storagePath, ...concept }) => ({
    ...concept,
    url: storagePath ? signedUrls.get(storagePath) ?? concept.url : concept.url
  }));
}

function normalizeImageContentType(value: string | null) {
  const contentType = value?.split(";")[0].trim().toLowerCase() || "image/png";
  if (contentType === "image/jpg") return "image/jpeg";
  return contentType;
}

export class StorageImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageImageError";
  }
}
