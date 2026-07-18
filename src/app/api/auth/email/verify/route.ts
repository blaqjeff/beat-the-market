import { NextRequest, NextResponse } from "next/server";

import { verifyEmailSignIn } from "@/lib/auth/email";
import { AppError } from "@/lib/errors/app-error";
import { jsonError } from "@/lib/errors/http";
import { serverEnv } from "@/lib/env/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const code = request.nextUrl.searchParams.get("code");
    if (!token || !code) {
      throw new AppError("validation", "Missing sign-in token");
    }

    await verifyEmailSignIn(token, code);
    return NextResponse.redirect(new URL("/", serverEnv().APP_URL));
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, serverEnv().APP_URL)
      );
    }
    return jsonError(error);
  }
}
