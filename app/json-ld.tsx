import { YT_MUSIC_PLAYLIST_URL } from "@/lib/playlist";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Structured data for the landing page.
 *
 * Deliberately omits `track` and `numTracks`: the tracklist is resolved from
 * YouTube in the browser, so there is nothing to back those claims up at build
 * time and marking up content the page cannot show is a guidelines violation.
 */
const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: ["en-IN", "hi-IN"],
      publisher: { "@id": `${SITE_URL}/#person` },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Harshit",
      url: "https://harxit.com",
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#playlist` },
      primaryImageOfPage: `${SITE_URL}/og.jpg`,
      inLanguage: "en-IN",
    },
    {
      "@type": "MusicPlaylist",
      "@id": `${SITE_URL}/#playlist`,
      name: `${SITE_NAME} — Indian Highway Playlist`,
      description: SITE_DESCRIPTION,
      url: `${SITE_URL}/`,
      sameAs: YT_MUSIC_PLAYLIST_URL,
      image: `${SITE_URL}/og.jpg`,
      genre: ["Punjabi music", "Bhojpuri music", "Bollywood", "Folk"],
      inLanguage: ["hi-IN", "pa-IN", "bho"],
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      // Values are build-time constants; the escape follows the documented
      // Next.js pattern so a future dynamic value cannot break out of the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}
