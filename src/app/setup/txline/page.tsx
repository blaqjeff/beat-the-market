import { notFound } from "next/navigation";
import Link from "next/link";

import { ActivationPanel } from "@/components/txline/ActivationPanel";

export default function TxlineSetupPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl items-center px-4 py-12">
      <div className="w-full">
        <Link
          href="/"
          className="mb-5 inline-block text-sm text-zinc-500 transition hover:text-zinc-200"
        >
          Back to Beat the Market
        </Link>
        <ActivationPanel />
      </div>
    </main>
  );
}
