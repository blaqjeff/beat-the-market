import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { serverEnv } from "@/lib/env/server";
import { TXLINE_ENDPOINTS, TXLINE_NETWORKS } from "@/lib/txline/constants";
import {
  assertLocalSetupRequest,
  LocalSetupUnavailableError,
} from "@/lib/txline/local-setup";

const guestResponseSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    assertLocalSetupRequest(request);
    const env = serverEnv();
    const apiOrigin =
      env.TXLINE_API_ORIGIN ?? TXLINE_NETWORKS[env.TXLINE_NETWORK].apiOrigin;

    const upstream = await fetch(
      new URL(TXLINE_ENDPOINTS.guestAuth, apiOrigin),
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(env.TXLINE_REQUEST_TIMEOUT_MS),
      }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `TxLINE guest authentication failed (${upstream.status})` },
        { status: 502 }
      );
    }

    const { token } = guestResponseSchema.parse(await upstream.json());
    return NextResponse.json({
      token,
      network: env.TXLINE_NETWORK,
    });
  } catch (error) {
    if (error instanceof LocalSetupUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[txline guest]", error);
    return NextResponse.json(
      { error: "Could not start TxLINE authentication" },
      { status: 500 }
    );
  }
}
