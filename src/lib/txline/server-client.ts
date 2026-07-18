import "server-only";

import { hasTxlineCredentials, serverEnv } from "@/lib/env/server";
import { TxlineClient } from "./client";
import { TXLINE_NETWORKS } from "./constants";

export function createServerTxlineClient(): TxlineClient {
  const env = serverEnv();
  if (!hasTxlineCredentials(env)) {
    throw new Error(
      "TxLINE credentials are unavailable. Activate a subscription and set both server credentials."
    );
  }

  const network = TXLINE_NETWORKS[env.TXLINE_NETWORK];

  return new TxlineClient({
    apiOrigin: env.TXLINE_API_ORIGIN ?? network.apiOrigin,
    guestJwt: env.TXLINE_GUEST_JWT,
    apiToken: env.TXLINE_API_TOKEN,
    timeoutMs: env.TXLINE_REQUEST_TIMEOUT_MS,
  });
}
