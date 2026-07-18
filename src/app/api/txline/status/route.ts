import { NextResponse } from "next/server";

import { hasTxlineCredentials, serverEnv } from "@/lib/env/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const env = serverEnv();

  return NextResponse.json({
    activated: hasTxlineCredentials(env),
    network: env.TXLINE_NETWORK,
    apiOrigin: env.TXLINE_API_ORIGIN ?? null,
  });
}
