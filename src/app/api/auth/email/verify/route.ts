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

    const { linked } = await verifyEmailSignIn(token, code);
    const destination = linked
      ? "/settings?linked=email"
      : "/";
    return NextResponse.redirect(new URL(destination, serverEnv().APP_URL));
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, serverEnv().APP_URL)
      );
    }
    return jsonError(error);
  }
}
