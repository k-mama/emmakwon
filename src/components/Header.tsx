"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { primaryNav, type NavItem } from "@/content/navigation";
import MobileNav from "./MobileNav";
import styles from "./Header.module.css";

type HeaderProps = {
  /** Pages with no video Hero (id="hero") to fade in from — render the
      normal opaque header immediately instead of the transparent overlay. */
  opaque?: boolean;
};

const submenuIdFor = (label: string) => `desktop-submenu-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

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
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu();
      }}
    >
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} onFocus={closeMenu} onClick={closeMenu}>
          Emma Kwon
        </Link>

        <MobileNav items={primaryNav} overlay={!scrolledPastHero} />

        <nav className={styles.nav} aria-label="Primary">
          {primaryNav.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const submenuId = submenuIdFor(item.label);

            return (
              <div
                key={item.label}
                className={styles.navItem}
                onMouseEnter={() => openMenu(item)}
                onFocus={() => openMenu(item)}
              >
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${activeMenu === item.label ? styles.navLinkActive : ""}`}
                  aria-haspopup={hasChildren ? "true" : undefined}
                  aria-expanded={hasChildren ? activeMenu === item.label : undefined}
                  aria-controls={hasChildren ? submenuId : undefined}
                  onClick={closeMenu}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && hasChildren) {
                      event.preventDefault();
                      setActiveMenu(item.label);
                      requestAnimationFrame(() => {
                        document.querySelector<HTMLAnchorElement>(`#${submenuId} a`)?.focus();
                      });
                    }
                    if (event.key === "Escape") closeMenu();
                  }}
                >
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {activeItem?.children?.length ? (
        <div
          id={submenuIdFor(activeItem.label)}
          className={styles.subnav}
          onMouseEnter={() => setActiveMenu(activeItem.label)}
          onFocus={() => setActiveMenu(activeItem.label)}
        >
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
