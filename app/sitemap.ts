import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bookyourvibe.in";

const routes = [
  "",
  "/venues",
  "/tournaments",
  "/challenge",
  "/games",
  "/coaches",
  "/community",
  "/events",
  "/food",
  "/offers",
  "/blogs",
  "/about-us",
  "/contact-us",
  "/privacy-policy",
  "/terms-conditions",
  "/refund-policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: route === "" ? 1 : 0.7,
  }));
}
