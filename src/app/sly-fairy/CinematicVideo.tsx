"use client";

import { useEffect, useRef } from "react";
import styles from "./CinematicStage.module.css";

type CinematicVideoProps = {
  src: string;
  poster?: string;
  alt?: string;
};

export default function CinematicVideo({ src, poster, alt = "" }: CinematicVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyMotionPreference = (reduceMotion: boolean) => {
      if (reduceMotion) {
        video.pause();
        video.removeAttribute("autoplay");
      } else {
        video.setAttribute("autoplay", "");
        video.play().catch(() => {});
      }
    };

    applyMotionPreference(query.matches);

    const handleChange = (event: MediaQueryListEvent) => applyMotionPreference(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return (
    <video
      ref={videoRef}
      className={styles.asset}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  );
}
