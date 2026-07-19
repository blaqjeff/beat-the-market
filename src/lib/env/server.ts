import "server-only";

import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().min(1).optional()
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.url().optional()
);

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    APP_URL: z.url().default("http://localhost:3000"),
    SENDBYTE_API_KEY: optionalSecret,
    EMAIL_FROM: z
      .string()
      .min(3)
      .default("Beat the Market <noreply@example.com>"),
    TXLINE_NETWORK: z.enum(["mainnet", "devnet"]).default("mainnet"),
    TXLINE_API_ORIGIN: optionalUrl,
    TXLINE_GUEST_JWT: optionalSecret,
    TXLINE_API_TOKEN: optionalSecret,
    SOLANA_RPC_URL: optionalUrl,
    TXLINE_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    TXLINE_MAX_SNAPSHOT_AGE_MS: z.coerce
      .number()
      .int()
      .positive()
      // TxLINE only pushes a market when the price moves. Stable boards must
      // stay tradeable for a couple of minutes, not 15 seconds.
      .default(120_000),
    /** Comma-separated TxLINE competition IDs for fixture catalogue sync. */
    TXLINE_COMPETITION_IDS: z
      .preprocess(
        (value) =>
          typeof value === "string" && value.trim().length === 0
            ? undefined
            : value,
        z.string().optional()
      )
      .default("72"),
  })
  .superRefine((env, context) => {
    const hasJwt = Boolean(env.TXLINE_GUEST_JWT);
    const hasToken = Boolean(env.TXLINE_API_TOKEN);

    if (hasJwt !== hasToken) {
      context.addIssue({
        code: "custom",
        path: hasJwt ? ["TXLINE_API_TOKEN"] : ["TXLINE_GUEST_JWT"],
        message:
          "TXLINE_GUEST_JWT and TXLINE_API_TOKEN must either both be set or both be absent",
      });
    }

    if (env.NODE_ENV === "production" && !env.SENDBYTE_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["SENDBYTE_API_KEY"],
        message: "SENDBYTE_API_KEY is required in production for email sign-in",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) {
    cached = serverEnvSchema.parse(process.env);
  }
  return cached;
}

export function resetServerEnvCache() {
  cached = undefined;
}

export function hasTxlineCredentials(
  env: ServerEnv = serverEnv()
): env is ServerEnv & {
  TXLINE_GUEST_JWT: string;
  TXLINE_API_TOKEN: string;
} {
  return Boolean(env.TXLINE_GUEST_JWT && env.TXLINE_API_TOKEN);
}

export function hasEmailDelivery(env: ServerEnv = serverEnv()) {
  return Boolean(env.SENDBYTE_API_KEY);
}
