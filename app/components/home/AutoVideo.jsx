"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";

/**
 * A muted, looping clip that only plays while it is on screen and always carries a pause
 * control (WCAG 2.2.2 — moving content that auto-plays for more than 5s must be stoppable).
 * Under prefers-reduced-motion it stays on its poster until the visitor presses play.
 *
 * Fills its parent, which must be `position: relative`. The button sits bottom-LEFT: the
 * site's floating WhatsApp button lives in the bottom-right corner of the screen and would
 * cover a control placed there at some scroll positions.
 */
export function AutoVideo({ mp4, webm, poster, buttonClassName = "" }) {
  const videoRef = useRef(null);
  // Set once the visitor has paused (or motion is reduced), so scrolling back into view
  // doesn't override their choice.
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      manuallyPaused.current = true;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
        } else if (!manuallyPaused.current) {
          video.play().catch(() => {
            // Autoplay can be refused (data saver, low-power mode) — the poster and the play
            // button are still there, so there is nothing to recover.
          });
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      manuallyPaused.current = false;
      video.play().catch(() => {});
    } else {
      manuallyPaused.current = true;
      video.pause();
    }
  }

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {webm && <source src={webm} type="video/webm" />}
        {mp4 && <source src={mp4} type="video/mp4" />}
      </video>

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause video" : "Play video"}
        className={`absolute bottom-4 left-4 z-10 grid size-12 place-items-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-colors hover:bg-black/85 md:bottom-6 md:left-6 ${buttonClassName}`}
      >
        {playing ? <Pause size={18} weight="fill" aria-hidden="true" /> : <Play size={18} weight="fill" aria-hidden="true" />}
      </button>
    </>
  );
}
