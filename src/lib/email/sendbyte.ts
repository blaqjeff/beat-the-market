import "server-only";

import { SendByte } from "@sendbyte/node";

import { serverEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  tags?: string[];
  idempotencyKey?: string;
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  const env = serverEnv();
  if (!env.SENDBYTE_API_KEY) {
    throw new AppError("internal", "SENDBYTE_API_KEY is not configured");
  }

  const client = new SendByte(env.SENDBYTE_API_KEY);

  try {
    const email = await client.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      tags: input.tags,
      idempotency_key: input.idempotencyKey,
    });

    return { id: email.id };
  } catch (error) {
    throw new AppError("upstream", "Failed to send email via SendByte", error);
  }
}
