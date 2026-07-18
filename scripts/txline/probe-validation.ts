import { loadEnvConfig } from "@next/env";

import { TxlineClient, TxlineHttpError } from "../../src/lib/txline/client";
import { TXLINE_NETWORKS, type TxlineNetwork } from "../../src/lib/txline/constants";

loadEnvConfig(process.cwd());

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const fixtureId = process.argv[2] ?? "18257865";
  const sequence = Number(process.argv[3] ?? "1");
  const network = (process.env.TXLINE_NETWORK ?? "mainnet") as TxlineNetwork;

  const client = new TxlineClient({
    apiOrigin:
      process.env.TXLINE_API_ORIGIN ?? TXLINE_NETWORKS[network].apiOrigin,
    guestJwt: requiredEnv("TXLINE_GUEST_JWT"),
    apiToken: requiredEnv("TXLINE_API_TOKEN"),
  });

  try {
    const result = await client.scoreValidation({
      fixtureId,
      sequence,
      statKeys: [1, 2],
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof TxlineHttpError) {
      console.log(
        JSON.stringify(
          {
            status: error.status,
            endpoint: error.endpoint,
            preview: error.responsePreview,
          },
          null,
          2
        )
      );
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
