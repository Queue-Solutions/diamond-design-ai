import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-2xl luxury-shimmer bg-[length:200%_100%]",
        className
      )}
    />
  );
}
