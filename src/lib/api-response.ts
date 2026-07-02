import { NextResponse } from "next/server";
import { MissingEnvironmentVariableError } from "@/config/env";

export type ApiErrorResponse = {
  error: string;
  code?: string;
  demoMode?: boolean;
};

export function apiError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

export function methodNotAllowed() {
  return apiError("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiInputError("Invalid JSON request body.");
  }
}

export class ApiInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiInputError";
  }
}

export function handleApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiInputError) {
    return apiError(error.message, 400, "INVALID_INPUT");
  }

  if (error instanceof MissingEnvironmentVariableError) {
    return apiError(error.message, 503, "MISSING_ENV");
  }

  console.error(fallbackMessage, error);
  return apiError(fallbackMessage, 500, "SERVER_ERROR");
}
