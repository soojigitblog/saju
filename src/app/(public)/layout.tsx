import { SiteHeader } from "@/components/layout/site-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ClientIssueReporter } from "@/components/feedback/client-issue-reporter";
import { ensureGuestSessionId } from "@/lib/guest/cookie";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureGuestSessionId();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileBottomNav />
      <ClientIssueReporter />
    </div>
  );
}
