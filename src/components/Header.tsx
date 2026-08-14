"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { primaryNav, type NavItem } from "@/content/navigation";
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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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

  const closeMenu = () => setActiveMenu(null);
  const openMenu = (item: NavItem) => setActiveMenu(item.children?.length ? item.label : null);
  const activeItem = primaryNav.find((item) => item.label === activeMenu);

  return (
    <header
      className={`${styles.header} ${scrolledPastHero ? styles.scrolled : ""}`}
      onMouseLeave={closeMenu}
    >
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} onFocus={closeMenu} onClick={closeMenu}>
          Emma Kwon
        </Link>

        <MobileNav items={primaryNav} overlay={!scrolledPastHero} />

        <nav className={styles.nav} aria-label="Primary">
          {primaryNav.map((item) => (
            <div
              key={item.label}
              className={styles.navItem}
              onMouseEnter={() => openMenu(item)}
              onFocus={() => openMenu(item)}
            >
              <Link
                href={item.href}
                className={`${styles.navLink} ${activeMenu === item.label ? styles.navLinkActive : ""}`}
                aria-haspopup={item.children?.length ? "true" : undefined}
                aria-expanded={item.children?.length ? activeMenu === item.label : undefined}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </nav>

        <div className={styles.utility} onMouseEnter={closeMenu}>
          <LanguageMenu triggerClassName={styles.iconBtn} />
        </div>
      </div>

      {activeItem?.children?.length ? (
        <div className={styles.subnav} onMouseEnter={() => setActiveMenu(activeItem.label)}>
          <nav className={styles.subnavInner} aria-label={`${activeItem.label} submenu`}>
            {activeItem.children.map((child) => (
              <Link
                key={`${activeItem.label}-${child.label}`}
                href={child.href}
                className={styles.subnavLink}
                onClick={closeMenu}
              >
                {child.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
