"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

export default function HeroVideo() {
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
      className={styles.video}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    >
      <source src="/media/surf-ai.mp4" type="video/mp4" />
    </video>
  );
}
