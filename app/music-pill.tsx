"use client";

import { motion, useReducedMotion } from "framer-motion";
import posthog from "posthog-js";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  YT_MUSIC_PLAYLIST_URL,
  YT_PLAYLIST_ID,
  youtubeThumb,
} from "@/lib/playlist";
import {
  loadYouTubeAPI,
  YT_STATE,
  type YTPlayer,
  type YTPlayerEvent,
} from "@/lib/youtube";

/** Minimum time the skeleton stays up so the swap never feels instant/janky */
const MIN_SKELETON_MS = 1100;
const posthogEnabled = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export type MusicPillProps = {
  autoplay?: boolean;
  className?: string;
};

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function ControlButton({
  onClick,
  ariaLabel,
  children,
  primary = false,
  disabled = false,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      whileHover={
        disabled ? undefined : { scale: 1.06, filter: "brightness(1.12)" }
      }
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      className="music-pill__btn"
      style={
        {
          "--btn-bg": primary
            ? "rgba(255,255,255,0.26)"
            : "rgba(255,255,255,0.14)",
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? "default" : "pointer",
        } as CSSProperties
      }
    >
      {children}
    </motion.button>
  );
}

function PillSkeleton() {
  return (
    <div
      className="music-pill music-pill--loading"
      aria-busy="true"
      aria-label="Loading playlist"
      role="status"
    >
      <div className="music-pill__sheen" aria-hidden="true" />
      <div
        className="music-pill__cover music-pill__skel-cover"
        aria-hidden="true"
      >
        <span className="music-pill__skel-pulse" />
      </div>
      <div className="music-pill__body">
        <div className="music-pill__row">
          <div className="music-pill__meta">
            <div className="music-pill__skel-line music-pill__skel-line--title" />
            <div className="music-pill__skel-line music-pill__skel-line--artist" />
          </div>
          <div className="music-pill__controls" aria-hidden="true">
            <span className="music-pill__skel-dot" />
            <span className="music-pill__skel-dot music-pill__skel-dot--lg" />
            <span className="music-pill__skel-dot" />
          </div>
        </div>
        <div className="music-pill__progress">
          <span className="music-pill__skel-time" />
          <div className="music-pill__rail music-pill__skel-rail" />
          <span className="music-pill__skel-time" />
        </div>
      </div>
    </div>
  );
}

export function MusicPill({ autoplay = false, className = "" }: MusicPillProps) {
  const reduceMotion = useReducedMotion();
  const reactId = useId().replace(/:/g, "");
  const hostId = `yt-host-${reactId}`;

  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const metaPollRef = useRef<number | null>(null);
  const mountedAtRef = useRef(Date.now());
  const seekRailRef = useRef<HTMLDivElement | null>(null);
  const seekingRef = useRef(false);
  const titleContainerRef = useRef<HTMLDivElement | null>(null);
  const titleTextRef = useRef<HTMLSpanElement | null>(null);

  /** Player API mounted and playlist cued */
  const [playerReady, setPlayerReady] = useState(false);
  /** First track meta filled — not shown until min skeleton delay passes */
  const [metaReady, setMetaReady] = useState(false);
  /** Skeleton → pill after meta + minimum delay */
  const [showPlayer, setShowPlayer] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [cover, setCover] = useState("");
  const [shouldScrollTitle, setShouldScrollTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tryRevealMeta = useCallback((player: YTPlayer): boolean => {
    try {
      const data = player.getVideoData();
      const id = data.video_id;
      const title = data.title?.trim();
      // YouTube often returns empty title until cued; wait for a real title
      if (!title || title === "Private video" || !id) return false;

      setSongTitle(title);
      setArtistName(data.author?.trim() || "YouTube Music");
      setCover(youtubeThumb(id));
      const d = player.getDuration();
      if (Number.isFinite(d) && d > 0) setDuration(d);
      setMetaReady(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const syncMeta = useCallback(
    (player: YTPlayer) => {
      try {
        const data = player.getVideoData();
        const id = data.video_id;
        if (data.title?.trim()) setSongTitle(data.title.trim());
        if (data.author?.trim()) setArtistName(data.author.trim());
        if (id) setCover(youtubeThumb(id));
        const d = player.getDuration();
        if (Number.isFinite(d) && d > 0) setDuration(d);
        if (!metaReady && data.title?.trim() && id) {
          setMetaReady(true);
        }
      } catch {
        /* ignore */
      }
    },
    [metaReady],
  );

  // Hold skeleton for a beat even if YouTube returns instantly
  useEffect(() => {
    if (!metaReady) return;
    const elapsed = Date.now() - mountedAtRef.current;
    const wait = Math.max(0, MIN_SKELETON_MS - elapsed);
    const id = window.setTimeout(() => setShowPlayer(true), wait);
    return () => window.clearTimeout(id);
  }, [metaReady]);

  const stopPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPoll = useCallback(
    (player: YTPlayer) => {
      stopPoll();
      pollRef.current = window.setInterval(() => {
        if (seekingRef.current) return;
        try {
          setProgress(player.getCurrentTime() || 0);
          const d = player.getDuration();
          if (Number.isFinite(d) && d > 0) setDuration(d);
        } catch {
          /* ignore */
        }
      }, 250);
    },
    [stopPoll],
  );

  const seekToRatio = useCallback(
    (ratio: number) => {
      const p = playerRef.current;
      if (!p || !playerReady || duration <= 0) return;
      const clamped = Math.min(1, Math.max(0, ratio));
      const t = clamped * duration;
      try {
        p.seekTo(t, true);
        setProgress(t);
      } catch {
        /* ignore */
      }
    },
    [duration, playerReady],
  );

  const ratioFromPointer = useCallback((clientX: number) => {
    const rail = seekRailRef.current;
    if (!rail) return 0;
    const rect = rail.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return (clientX - rect.left) / rect.width;
  }, []);

  const onSeekPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!playerReady || duration <= 0) return;
      e.preventDefault();
      seekingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekToRatio(ratioFromPointer(e.clientX));
    },
    [duration, playerReady, ratioFromPointer, seekToRatio],
  );

  const onSeekPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!seekingRef.current) return;
      seekToRatio(ratioFromPointer(e.clientX));
    },
    [ratioFromPointer, seekToRatio],
  );

  const onSeekPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!seekingRef.current) return;
      seekingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      seekToRatio(ratioFromPointer(e.clientX));
      if (posthogEnabled) {
        posthog.capture("playlist_seek_completed", {
          position_seconds: Math.round(
            Math.min(1, Math.max(0, ratioFromPointer(e.clientX))) * duration,
          ),
        });
      }
    },
    [duration, ratioFromPointer, seekToRatio],
  );

  const onSeekKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!playerReady || duration <= 0) return;
      const step = e.shiftKey ? 10 : 5;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        seekToRatio((progress + step) / duration);
        if (posthogEnabled) {
          posthog.capture("playlist_seek_completed", {
            position_seconds: Math.round(Math.min(duration, progress + step)),
          });
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        seekToRatio((progress - step) / duration);
        if (posthogEnabled) {
          posthog.capture("playlist_seek_completed", {
            position_seconds: Math.round(Math.max(0, progress - step)),
          });
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        seekToRatio(0);
        if (posthogEnabled) {
          posthog.capture("playlist_seek_completed", { position_seconds: 0 });
        }
      } else if (e.key === "End") {
        e.preventDefault();
        seekToRatio(1);
        if (posthogEnabled) {
          posthog.capture("playlist_seek_completed", {
            position_seconds: Math.round(duration),
          });
        }
      }
    },
    [duration, playerReady, progress, seekToRatio],
  );

  // Mount hidden YouTube player + wait for first track meta before UI reveal
  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;

    const clearMetaPoll = () => {
      if (metaPollRef.current != null) {
        window.clearInterval(metaPollRef.current);
        metaPollRef.current = null;
      }
    };

    const beginMetaPoll = (p: YTPlayer) => {
      clearMetaPoll();
      let attempts = 0;
      metaPollRef.current = window.setInterval(() => {
        if (cancelled) {
          clearMetaPoll();
          return;
        }
        attempts += 1;
        if (tryRevealMeta(p) || attempts > 40) {
          // ~8s max wait; if still no title, reveal with error/empty-safe UI
          if (attempts > 40 && !cancelled) {
            try {
              const data = p.getVideoData();
              if (data.video_id) {
                setCover(youtubeThumb(data.video_id));
                setSongTitle(data.title?.trim() || "Highway playlist");
                setArtistName(data.author?.trim() || "YouTube Music");
              } else {
                setSongTitle("Highway playlist");
                setArtistName("YouTube Music");
              }
            } catch {
              setSongTitle("Highway playlist");
              setArtistName("YouTube Music");
            }
            setMetaReady(true);
          }
          clearMetaPoll();
        }
      }, 200);
    };

    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled) return;

        player = new YT.Player(hostId, {
          height: 1,
          width: 1,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            listType: "playlist",
            list: YT_PLAYLIST_ID,
            origin:
              typeof window !== "undefined" ? window.location.origin : "",
          },
          events: {
            onReady: (e: YTPlayerEvent) => {
              if (cancelled) return;
              playerRef.current = e.target;

              e.target.cuePlaylist({
                listType: "playlist",
                list: YT_PLAYLIST_ID,
                index: 0,
              });

              setPlayerReady(true);
              beginMetaPoll(e.target);

              if (autoplay) {
                e.target.playVideo();
              }
            },
            onStateChange: (e: YTPlayerEvent) => {
              if (cancelled) return;
              const state = e.data;
              if (state === YT_STATE.PLAYING) {
                setIsPlaying(true);
                syncMeta(e.target);
                tryRevealMeta(e.target);
                startPoll(e.target);
              } else if (state === YT_STATE.PAUSED) {
                setIsPlaying(false);
                stopPoll();
                setProgress(e.target.getCurrentTime() || 0);
              } else if (state === YT_STATE.ENDED) {
                stopPoll();
                setIsPlaying(false);
                setProgress(0);
              } else if (
                state === YT_STATE.CUED ||
                state === YT_STATE.BUFFERING
              ) {
                syncMeta(e.target);
                tryRevealMeta(e.target);
              }
            },
            onError: () => {
              if (!cancelled) {
                setError("Couldn’t load this track — try next.");
                setLoadError("Playlist failed to load.");
                // Still reveal UI so user can retry / open YTM
                setMetaReady(true);
                setSongTitle((t) => t || "Highway playlist");
                setArtistName((a) => a || "Tap play or open YouTube Music");
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("YouTube player failed to load.");
          setMetaReady(true);
          setSongTitle("Couldn’t load player");
          setArtistName("Check connection and refresh");
        }
      });

    return () => {
      cancelled = true;
      stopPoll();
      clearMetaPoll();
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [
    autoplay,
    hostId,
    startPoll,
    stopPoll,
    syncMeta,
    tryRevealMeta,
  ]);

  // Title marquee measure
  useEffect(() => {
    if (!metaReady) return;
    const container = titleContainerRef.current;
    const text = titleTextRef.current;
    if (!container || !text) return;

    const measure = () => {
      const needs =
        text.getBoundingClientRect().width >
        container.getBoundingClientRect().width + 1;
      setShouldScrollTitle(needs);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [songTitle, metaReady]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    setError(null);
    try {
      const state = p.getPlayerState();
      if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
        p.pauseVideo();
        if (posthogEnabled) {
          posthog.capture("playlist_playback_toggled", { action: "paused" });
        }
      } else {
        p.playVideo();
        if (posthogEnabled) {
          posthog.capture("playlist_playback_toggled", { action: "played" });
        }
      }
    } catch {
      setError("Playback blocked — click play again.");
    }
  }, [playerReady]);

  // Space (and K, like YouTube) toggles play anywhere on the page
  useEffect(() => {
    if (!showPlayer || !playerReady) return;

    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return Boolean(el.closest("[contenteditable='true']"));
    };

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      // Space / K → play-pause (the obvious one)
      if (e.code === "Space" || e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playerReady, showPlayer, togglePlay]);

  const prev = useCallback(() => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    setError(null);
    try {
      if ((p.getCurrentTime() || 0) > 3) {
        p.seekTo(0, true);
        setProgress(0);
      } else {
        p.previousVideo();
      }
      if (posthogEnabled) {
        posthog.capture("playlist_track_skipped", { direction: "previous" });
      }
    } catch {
      /* ignore */
    }
  }, [playerReady]);

  const next = useCallback(() => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    setError(null);
    try {
      p.nextVideo();
      if (posthogEnabled) {
        posthog.capture("playlist_track_skipped", { direction: "next" });
      }
    } catch {
      /* ignore */
    }
  }, [playerReady]);

  const progressPercent =
    duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className={`music-pill-root ${className}`.trim()}>
      {/* Always mount YT host so API can initialize while skeleton shows */}
      <div className="music-pill__yt-host" aria-hidden="true">
        <div id={hostId} />
      </div>

      {/* Instant swap — no exit/enter animation (avoids pill pop) */}
      {!showPlayer ? (
        <PillSkeleton />
      ) : (
        <div className="music-pill" aria-label="YouTube Music player">
          <div className="music-pill__sheen" aria-hidden="true" />

          <div
            className={
              isPlaying ? "music-pill__cover is-spinning" : "music-pill__cover"
            }
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                draggable={false}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.src.includes("hq720")) {
                    el.src = el.src.replace("hq720.jpg", "hqdefault.jpg");
                  }
                }}
              />
            ) : (
              <span
                className="music-pill__cover-fallback"
                aria-hidden="true"
              />
            )}
            <span className="music-pill__cover-hub" aria-hidden="true" />
          </div>

          <div className="music-pill__body">
            <div className="music-pill__row">
              <div className="music-pill__meta">
                <div className="music-pill__title-wrap" ref={titleContainerRef}>
                  <span
                    ref={titleTextRef}
                    className={
                      shouldScrollTitle && !reduceMotion
                        ? "music-pill__title music-pill__title--scroll"
                        : "music-pill__title"
                    }
                  >
                    {songTitle}
                  </span>
                </div>
                <p className="music-pill__artist">
                  {error ?? loadError ?? artistName}
                </p>
              </div>

              <div className="music-pill__controls">
                <ControlButton
                  ariaLabel="Previous track"
                  onClick={prev}
                  disabled={!playerReady}
                >
                  <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                    <circle
                      cx="14"
                      cy="14"
                      r="13"
                      fill="rgba(255,255,255,0.19)"
                    />
                    <path
                      d="M17.5 19L12.5 14L17.5 9"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ControlButton>

                <ControlButton
                  ariaLabel={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  primary
                  disabled={!playerReady}
                >
                  {isPlaying ? (
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                      <circle
                        cx="16"
                        cy="16"
                        r="15"
                        fill="rgba(255,255,255,0.23)"
                      />
                      <rect
                        x="11"
                        y="10"
                        width="3.5"
                        height="12"
                        rx="1"
                        fill="currentColor"
                      />
                      <rect
                        x="17.5"
                        y="10"
                        width="3.5"
                        height="12"
                        rx="1"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                      <circle
                        cx="16"
                        cy="16"
                        r="15"
                        fill="rgba(255,255,255,0.23)"
                      />
                      <polygon
                        points="12,10 12,22 22,16"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </ControlButton>

                <ControlButton
                  ariaLabel="Next track"
                  onClick={next}
                  disabled={!playerReady}
                >
                  <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                    <circle
                      cx="14"
                      cy="14"
                      r="13"
                      fill="rgba(255,255,255,0.19)"
                    />
                    <path
                      d="M10.5 9L15.5 14L10.5 19"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ControlButton>
              </div>
            </div>

            <div className="music-pill__progress">
              <span className="music-pill__time">{formatTime(progress)}</span>
              <div
                ref={seekRailRef}
                className="music-pill__rail music-pill__rail--seek"
                role="slider"
                tabIndex={playerReady && duration > 0 ? 0 : -1}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration) || 0}
                aria-valuenow={Math.floor(progress)}
                aria-valuetext={`${formatTime(progress)} of ${formatTime(duration)}`}
                aria-disabled={!playerReady || duration <= 0}
                onPointerDown={onSeekPointerDown}
                onPointerMove={onSeekPointerMove}
                onPointerUp={onSeekPointerUp}
                onPointerCancel={onSeekPointerUp}
                onKeyDown={onSeekKeyDown}
              >
                <div
                  className="music-pill__fill"
                  style={{ width: `${progressPercent}%` }}
                />
                <span
                  className="music-pill__knob"
                  style={{ left: `${progressPercent}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="music-pill__time">{formatTime(duration)}</span>
            </div>
          </div>

          <a
            className="music-pill__ytm-sr"
            href={YT_MUSIC_PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on YouTube Music
          </a>
        </div>
      )}
    </div>
  );
}
