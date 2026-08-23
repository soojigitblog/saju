"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { trackClientEvent } from "@/lib/analytics/client";

type ShareResourceType = "FREE_RESULT" | "TAROT_READING";

export function ShareButton({
  resourceType,
  resourceId,
  variant = "outline",
  size = "sm",
  className,
}: {
  resourceType: ShareResourceType;
  resourceId: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default" | "full";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ resourceType, resourceId }),
      });
      const data = (await res.json()) as {
        shareUrl?: string;
        message?: string;
      };
      if (!res.ok || !data.shareUrl) {
        setError(data.message ?? "공유 링크를 만들 수 없습니다.");
        setBusy(false);
        return;
      }

      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      void trackClientEvent({
        eventName: "share_link_created",
        metadata: { resourceType, resourceId },
      });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("공유 링크를 복사하지 못했습니다.");
    }
    setBusy(false);
  }, [busy, resourceId, resourceType]);

  return (
    <div className={className}>
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={busy}
        onClick={() => void onShare()}
      >
        {busy ? "링크 생성 중..." : copied ? "링크 복사됨!" : "공유하기"}
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-[var(--error-text)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
