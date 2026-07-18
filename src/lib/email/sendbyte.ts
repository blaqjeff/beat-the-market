import "server-only";

import { SendByte, SendByteError } from "@sendbyte/node";

import { serverEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";
import { logError } from "@/lib/logging/logger";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  tags?: string[];
  idempotencyKey?: string;
}

function fromDomain(from: string): string | null {
  const match = /@([^>\s]+)/.exec(from);
  return match?.[1] ?? null;
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  const env = serverEnv();
  if (!env.SENDBYTE_API_KEY) {
    throw new AppError("internal", "SENDBYTE_API_KEY is not configured");
  }

  const apiKey = env.SENDBYTE_API_KEY.trim();
  const from = env.EMAIL_FROM.trim();

  try {
    const client = new SendByte(apiKey);
    const email = await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      tags: input.tags,
      idempotency_key: input.idempotencyKey,
    });

    return { id: email.id, sandbox: email.sandbox };
  } catch (error) {
    if (error instanceof SendByteError) {
      logError("email.sendbyte.failed", error, {
        code: error.code,
        status: error.status,
        docsUrl: error.docsUrl ?? null,
        fromDomain: fromDomain(from),
        keyType: apiKey.startsWith("sk_live_")
          ? "live"
          : apiKey.startsWith("sk_test_")
            ? "test"
            : "invalid",
      });
      throw new AppError(
        "upstream",
        `SendByte ${error.code}: ${error.message}`,
        {
          code: error.code,
          status: error.status,
          docsUrl: error.docsUrl ?? null,
          fromDomain: fromDomain(from),
        }
      );
    }

    logError("email.sendbyte.failed", error, {
      fromDomain: fromDomain(from),
    });
    throw new AppError(
      "upstream",
      error instanceof Error
        ? `Failed to send email via SendByte: ${error.message}`
        : "Failed to send email via SendByte",
      error
    );
  }
}
