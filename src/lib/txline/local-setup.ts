import "server-only";

import { NextRequest } from "next/server";

export function assertLocalSetupRequest(request: NextRequest): void {
  if (process.env.NODE_ENV === "production") {
    throw new LocalSetupUnavailableError();
  }

  const host = request.nextUrl.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new LocalSetupUnavailableError();
  }
}

export class LocalSetupUnavailableError extends Error {
  constructor() {
    super("TxLINE setup is available only on localhost in development");
    this.name = "LocalSetupUnavailableError";
  }
}
