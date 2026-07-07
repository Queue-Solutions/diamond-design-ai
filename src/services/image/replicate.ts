import Replicate from "replicate";
import { requireReplicateApiToken, serverEnv } from "@/config/env";
import {
  ImageGenerationError,
  MissingImageApiTokenError,
  type EditDesignProviderRequest,
  type GeneratedImage,
  type ImageGenerationProvider,
  type JewelryImagePrompt
} from "./provider";

const generationModel = "black-forest-labs/flux-2-pro";
const editModel = "black-forest-labs/flux-kontext-pro";
const requestTimeoutMs = 120_000;

type ReplicateOutput =
  | string
  | URL
  | Array<ReplicateOutput>
  | {
      url?: string | (() => URL | string);
      [key: string]: unknown;
    };

export class ReplicateImageProvider implements ImageGenerationProvider {
  private readonly client: Replicate;

  constructor(apiToken = serverEnv.replicateApiToken) {
    try {
      const token = apiToken || requireReplicateApiToken();
      this.client = new Replicate({ auth: token, useFileOutput: false });
    } catch {
      throw new MissingImageApiTokenError();
    }
  }

  async generateDesigns(requests: JewelryImagePrompt[]): Promise<GeneratedImage[]> {
    const images = await Promise.all(requests.map((request) => this.generateOne(request)));

    if (!images.length) {
      throw new ImageGenerationError("Replicate returned no images.");
    }

    return images;
  }

  private async generateOne(request: JewelryImagePrompt): Promise<GeneratedImage> {
    const output = await withTimeout(
      this.client.run(generationModel, {
        input: {
          prompt: request.prompt,
          aspect_ratio: "1:1",
          output_format: "webp",
          safety_tolerance: 2
        }
      }) as Promise<ReplicateOutput>,
      requestTimeoutMs
    );

    const url = extractImageUrl(output);

    if (!url) {
      throw new ImageGenerationError("Replicate returned an invalid image URL.");
    }

    return {
      id: crypto.randomUUID(),
      url,
      prompt: request.prompt,
      variationName: request.variationName,
      description: request.description,
      version: 1,
      parentId: null,
      rootId: "",
      createdAt: new Date().toISOString()
    };
  }

  async editDesign(request: EditDesignProviderRequest): Promise<GeneratedImage> {
    let output: ReplicateOutput;
    try {
      output = await withTimeout(
        this.client.run(editModel, {
          input: {
            prompt: request.prompt,
            input_image: request.imageUrl,
            output_format: "png",
            safety_tolerance: 2
          }
        }) as Promise<ReplicateOutput>,
        requestTimeoutMs
      );
    } catch (error) {
      throw new ImageGenerationError(`Replicate image edit failed: ${getErrorMessage(error)}`);
    }

    const url = extractImageUrl(output);

    if (!url) {
      throw new ImageGenerationError("Replicate returned an invalid edited image URL.");
    }

    const id = crypto.randomUUID();

    return {
      id,
      url,
      prompt: request.prompt,
      editInstruction: request.editInstruction,
      version: request.sourceVersion + 1,
      parentId: request.sourceImageId,
      rootId: request.rootId,
      variationName: `${request.variationName} / ${summarizeEdit(request.editInstruction)}`,
      description: `Refined from ${request.variationName}: ${request.editInstruction}`,
      createdAt: new Date().toISOString()
    };
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "The image provider rejected the edit request.";
}

function summarizeEdit(instruction: string) {
  const cleaned = instruction.trim().replace(/[.?!]+$/g, "");
  const words = cleaned.split(/\s+/).slice(0, 4).join(" ");
  return words ? `${words} Edit` : "Edited Concept";
}

function extractImageUrl(output: ReplicateOutput): string {
  if (Array.isArray(output)) {
    return extractImageUrl(output[0] ?? "");
  }

  if (output instanceof URL) {
    return output.toString();
  }

  if (typeof output === "string") {
    return isValidImageUrl(output) ? output : "";
  }

  if (typeof output === "object" && output !== null) {
    const outputWithUrl = output as { url?: string | (() => URL | string) };

    if (typeof outputWithUrl.url === "function") {
      const url = outputWithUrl.url();
      return extractImageUrl(url);
    }

    if (typeof outputWithUrl.url === "string") {
      return isValidImageUrl(outputWithUrl.url) ? outputWithUrl.url : "";
    }
  }

  return "";
}

function isValidImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new ImageGenerationError("Image generation timed out. Please try again.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
