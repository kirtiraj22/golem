import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "bad_request", message, details);
export const unauthorized = (message = "Authentication required") =>
  new ApiError(401, "unauthorized", message);
export const forbidden = (message = "Not allowed") =>
  new ApiError(403, "forbidden", message);
export const notFound = (message = "Not found") =>
  new ApiError(404, "not_found", message);
export const conflict = (message: string) =>
  new ApiError(409, "conflict", message);
export const unprocessable = (message: string) =>
  new ApiError(422, "unprocessable", message);

export function dbFailure(error: { message: string; code?: string }): ApiError {
  console.error("database error", error);
  return new ApiError(500, "database_error", "Database operation failed");
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function toResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Invalid input",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }
  console.error("unhandled error", error);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Internal server error" } },
    { status: 500 },
  );
}

export function route<C>(
  handler: (request: Request, context: C) => Promise<Response>,
) {
  return async (request: Request, context: C): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toResponse(error);
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
}