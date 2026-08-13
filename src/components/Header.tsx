"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { primaryNav } from "@/content/navigation";
import LanguageMenu from "./LanguageMenu";
import MobileNav from "./MobileNav";
import styles from "./Header.module.css";

type HeaderProps = {
  /** Pages with no video Hero (id="hero") to fade in from — render the
      normal opaque header immediately instead of the transparent overlay. */
  opaque?: boolean;
};

export default function Header({ opaque = false }: HeaderProps = {}) {
  const [scrolledPastHero, setScrolledPastHero] = useState(opaque);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;

    // Fires once the hero has scrolled out from under the sticky header,
    // so the transparent cinematic overlay can hand off to the normal
    // opaque ivory header for the rest of the page.
    const observer = new IntersectionObserver(([entry]) => setScrolledPastHero(!entry.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    });
    observer.observe(hero);

    return () => observer.disconnect();
  }, []);

  return (
    <header className={`${styles.header} ${scrolledPastHero ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Emma Kwon
        </Link>

        <MobileNav items={primaryNav} overlay={!scrolledPastHero} />

        <nav className={styles.nav} aria-label="Primary">
          {primaryNav.map((item) => (
            <a key={item.label} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.utility}>
          <LanguageMenu triggerClassName={styles.iconBtn} />
        </div>
      </div>
    </header>
  );
}
