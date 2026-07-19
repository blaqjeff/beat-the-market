import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountLinkPanel } from "@/components/auth/AccountLinkPanel";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserIdentities } from "@/lib/auth/user-profile";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const identities = await getUserIdentities(user.id);
  const params = await searchParams;
  const linkedNotice =
    params.linked === "email"
      ? "Email linked to your account."
      : params.linked === "wallet"
        ? "Wallet linked to your account."
        : null;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Account
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        Settings
      </h1>
      <p className="mt-3 text-[color:var(--muted)]">
        Update your profile and connect sign-in methods so you can access your
        account with email or wallet.
      </p>

      {linkedNotice ? (
        <p className="mt-6 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3 text-sm text-[color:var(--chalk)]">
          {linkedNotice}
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
          Profile
        </h2>
        <div className="mt-4">
          <ProfileForm
            key={`${user.username}:${user.displayName ?? ""}`}
            initialUsername={user.username}
            initialDisplayName={user.displayName}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[color:var(--chalk)]">
          Connected accounts
        </h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Link both methods to sign in either way without losing your stats.
        </p>
        <div className="mt-4">
          <AccountLinkPanel
            linkedEmail={identities.email}
            linkedWallet={identities.wallet}
          />
        </div>
      </section>

      <p className="mt-10 text-sm text-[color:var(--muted)]">
        <Link
          href={`/profile/${user.username}`}
          className="text-[color:var(--signal)] underline"
        >
          View profile
        </Link>
      </p>
    </main>
  );
}
