import { publicEnv } from "@/config/public-env";

export function DemoModeBanner() {
  if (!publicEnv.demoMode) return null;

  return (
    <div className="border-b border-diamond-champagne/30 bg-diamond-champagne/15 px-4 py-3 text-center text-sm font-medium text-diamond-champagne">
      Demo mode is enabled. Placeholder flows may appear when provider keys are unavailable. Turn this off before production launch.
    </div>
  );
}
