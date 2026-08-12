import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Bump when the page content meaningfully changes. A fixed date is deliberate:
 * `new Date()` would claim a fresh edit on every deploy and crawlers learn to
 * ignore a lastmod that always moves.
 */
const LAST_MODIFIED = "2026-08-12";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
