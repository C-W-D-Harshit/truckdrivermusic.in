/**
 * Canonical site details, shared by metadata, robots and sitemap.
 *
 * Override the origin per-environment with:
 *   NEXT_PUBLIC_SITE_URL=https://preview.example.com
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.truckdrivermusic.in"
).replace(/\/$/, "");

export const SITE_NAME = "Truck Driver Music";

export const SITE_TAGLINE = "Horn OK Please";

export const SITE_TITLE = "Truck Wala Music — Indian Truck Driver Playlist";

export const SITE_DESCRIPTION =
  "Play Punjabi, Hindi and Bhojpuri highway songs on Truck Wala Music, the free Indian truck driver playlist website. No signup—open and press play.";
