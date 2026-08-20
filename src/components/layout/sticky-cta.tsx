import Link from "next/link";
import { Button } from "@/components/ui/button";

export function StickyCta({
  href = "/fortune",
  label = "무료 사주 보기",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--bg-deep)_92%,transparent)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
      <div className="mx-auto max-w-lg">
        <Button asChild size="full" variant="parchment">
          <Link href={href}>{label}</Link>
        </Button>
      </div>
    </div>
  );
}
