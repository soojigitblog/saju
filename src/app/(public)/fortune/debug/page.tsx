import { notFound } from "next/navigation";
import { FortuneDebugClient } from "@/components/fortune/fortune-debug-client";

export const metadata = {
  title: "Fortune Engine Debug",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Dev-only diagnostic UI. Direct URL access is blocked outside development
 * (production / test / preview → 404).
 */
export default function FortuneDebugPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Fortune Engine Debug
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Development only — non-development environments return 404.
      </p>
      <div className="mt-8">
        <FortuneDebugClient />
      </div>
    </div>
  );
}
