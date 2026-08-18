import { Clock } from "./clock";
import { JsonLd } from "./json-ld";
import { Listeners } from "./listeners";
import { MusicPill } from "./music-pill";
import { TrackedLink } from "./tracked-link";
import { YT_MUSIC_PLAYLIST_URL } from "@/lib/playlist";

export default function Home() {
  return (
    <>
      <JsonLd />

      <div className="bg" aria-hidden="true">
        <div className="bg__img" />
        <div className="bg__scrim" />
      </div>

      <main className="shell">
        <header className="topbar">
          <div className="topbar__left">
            <Clock />
            <span className="topbar__sep" aria-hidden="true" />
            <Listeners />
          </div>

          <nav className="links" aria-label="Support and listen elsewhere">
            <TrackedLink
              event="support_link_opened"
              className="support"
              href="https://buymeacoffee.com/cwd.harshit"
              target="_blank"
              rel="noopener noreferrer"
              title="Buy me a coffee"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
                <path d="M17 10h1.6a2.4 2.4 0 0 1 0 4.8H17" />
                <path d="M8 2.5c-.7.9-.7 1.8 0 2.7M12 2.5c-.7.9-.7 1.8 0 2.7" />
              </svg>
              Support me
            </TrackedLink>

            <TrackedLink
              event="youtube_music_playlist_opened"
              className="link"
              href={YT_MUSIC_PLAYLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open playlist on YouTube Music"
              title="YouTube Music"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z" />
              </svg>
            </TrackedLink>
          </nav>
        </header>

        <div aria-hidden="true" style={{ height: "2.5rem" }} />

        <div className="logo-wrap">
          <h1 className="logo">
            <span className="logo__line" lang="hi">
              ट्रक ड्राइवर
            </span>
            <span className="logo__en" lang="en">
              Truck Wala Music
            </span>
          </h1>
        </div>

        <div className="dock">
          <p className="shayari">बुरी नज़र वाले तेरा मुँह काला</p>

          <MusicPill />

          <p className="credit">
            made with ❤️ by{" "}
            <a
              href="https://harxit.com?utm_source=truckdrivermusic.in&utm_medium=referral&utm_campaign=made_with_love"
              target="_blank"
              rel="noopener noreferrer"
            >
              Harshit
            </a>
          </p>
        </div>
      </main>

      <section className="playlist-guide" id="about" aria-labelledby="about-title">
        <div className="playlist-guide__inner">
          <p className="playlist-guide__eyebrow">Truck wala music, one tap away</p>
          <h2 id="about-title">The Indian truck driver playlist for long roads</h2>
          <p className="playlist-guide__lead">
            Truck Wala Music is a free playlist website for the Punjabi, Hindi,
            Bhojpuri and 90s Bollywood highway songs heard in truck cabins and
            roadside dhabas across India. Open the page, press play and keep the
            music running—there is no signup or app to install.
          </p>

          <div className="playlist-guide__highlights" aria-label="Playlist highlights">
            <article>
              <h3>Made for the highway</h3>
              <p>
                A non-stop truck driver playlist with simple controls that work
                on mobile and desktop.
              </p>
            </article>
            <article>
              <h3>Desi songs in one mix</h3>
              <p>
                Punjabi energy, Hindi favourites, Bhojpuri tracks and nostalgic
                Bollywood road songs.
              </p>
            </article>
            <article>
              <h3>No account needed</h3>
              <p>
                Start listening here, or open the same playlist on YouTube Music
                whenever you want.
              </p>
            </article>
          </div>

          <div className="playlist-guide__faq" aria-labelledby="playlist-faq-title">
            <h2 id="playlist-faq-title">About this truck wala playlist</h2>
            <div className="playlist-guide__faq-grid">
              <article>
                <h3>What is Truck Wala Music?</h3>
                <p>
                  It is a browser-based Indian truck music player built for quick,
                  uninterrupted listening without registration.
                </p>
              </article>
              <article>
                <h3>Does it work on a phone?</h3>
                <p>
                  Yes. The player is designed for mobile screens, with large play,
                  skip and seek controls for easy use.
                </p>
              </article>
              <article>
                <h3>Where does the music play from?</h3>
                <p>
                  The songs play through YouTube. You can also open the full truck
                  driver playlist directly on YouTube Music.
                </p>
              </article>
            </div>
          </div>

          <a
            className="playlist-guide__cta"
            href={YT_MUSIC_PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the playlist on YouTube Music
          </a>
        </div>
      </section>
    </>
  );
}
