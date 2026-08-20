import { cn } from "@/lib/utils";

export function MysticCard({
  className,
  children,
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "mystic-card p-5",
        hover && "mystic-card-hover cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MysticCardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      {children}
    </div>
  );
}
