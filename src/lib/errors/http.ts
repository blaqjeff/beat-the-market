import { NextResponse } from "next/server";

import { AppError, isAppError } from "@/lib/errors/app-error";
import { logError } from "@/lib/logging/logger";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown) {
  if (isAppError(error)) {
    if (error.status >= 500) {
      logError("request.failed", error, { code: error.code });
    }

    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? undefined,
        },
      },
      { status: error.status }
    );
  }

  logError("request.unhandled", error);

  return NextResponse.json(
    {
      error: {
        code: "internal",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}

export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new AppError("not_found", message);
  }
  return value;
}
