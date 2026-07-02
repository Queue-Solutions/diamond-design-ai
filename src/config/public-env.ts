export const publicEnv = {
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? ""
};

export function getPublicSiteUrl() {
  if (publicEnv.siteUrl) {
    return publicEnv.siteUrl.replace(/\/+$/g, "");
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/+$/g, "");
  }

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : "";
}
