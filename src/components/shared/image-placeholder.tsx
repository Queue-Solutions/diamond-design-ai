import { Gem } from "lucide-react";
import { cn } from "@/lib/utils";

type ImagePlaceholderProps = {
  label: string;
  className?: string;
};

export function ImagePlaceholder({ label, className }: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/3] min-h-52 overflow-hidden rounded-2xl border bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))]",
        className
      )}
    >
      <div className="absolute inset-0 bg-diamond-radial opacity-70" />
      <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="relative m-auto flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-black/40 shadow-glow">
          <Gem className="h-6 w-6 text-diamond-champagne" />
        </div>
        <p className="max-w-52 text-sm font-medium text-white">{label}</p>
      </div>
    </div>
  );
}
