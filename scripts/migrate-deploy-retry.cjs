#!/usr/bin/env node
/**
 * Retry prisma migrate deploy when Neon advisory locks time out
 * (common if two Vercel builds overlap).
 */
const { spawnSync } = require("node:child_process");

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* busy-wait; short retries only */
  }
}

const attempts = 5;
for (let i = 1; i <= attempts; i += 1) {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status === 0) {
    process.exit(0);
  }
  if (i === attempts) {
    process.exit(result.status ?? 1);
  }
  const waitSec = i * 5;
  console.warn(
    `prisma migrate deploy failed (attempt ${i}/${attempts}); retrying in ${waitSec}s…`
  );
  sleep(waitSec * 1000);
}
