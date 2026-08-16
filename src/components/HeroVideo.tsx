"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isInView = true;
    let reduceMotion = motionQuery.matches;

    const syncPlayback = () => {
      const shouldPlay = isInView && !reduceMotion && document.visibilityState === "visible";

      if (shouldPlay) {
        video.setAttribute("autoplay", "");
        video.play().catch(() => {});
      } else {
        video.pause();
        if (reduceMotion) video.removeAttribute("autoplay");
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInView = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.08 },
    );

    observer.observe(video);

    const handleMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      syncPlayback();
    };

    const handleVisibilityChange = () => syncPlayback();

    motionQuery.addEventListener("change", handleMotionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    syncPlayback();

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={styles.video}
      muted
      loop
      playsInline
      preload="metadata"
      poster="/media/surf-ai-poster.webp"
      aria-hidden="true"
    >
      <source src="/media/surf-ai.mp4" type="video/mp4" />
    </video>
  );
}
