/**
 * Canonical site details, shared by metadata, robots and sitemap.
 *
 * Override the origin per-environment with:
 *   NEXT_PUBLIC_SITE_URL=https://preview.example.com
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://truckdrivermusic.in"
).replace(/\/$/, "");

export const SITE_NAME = "Truck Driver Music";

export const SITE_TAGLINE = "Horn OK Please";

export const SITE_DESCRIPTION =
  "A non-stop playlist of the Punjabi, Hindi and Bhojpuri highway bangers that blast out of Indian trucks. No signup, no apps — open it and press play.";
