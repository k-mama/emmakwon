"use client";

import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/content/navigation";
import LanguageMenu from "./LanguageMenu";
import styles from "./MobileNav.module.css";

type MobileNavProps = {
  items: NavItem[];
  /** True while the header sits transparently over the Hero (light trigger icon). */
  overlay?: boolean;
};

export default function MobileNav({ items, overlay = false }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${overlay ? styles.triggerOverlay : ""}`}
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
          <line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.4" />
          <line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.4" />
          <line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      {open && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Site navigation">
          <div className={styles.overlayHeader}>
            <span className={styles.brand}>Emma Kwon</span>
            <button
              type="button"
              ref={closeRef}
              className={styles.closeBtn}
              aria-label="Close menu"
              onClick={handleClose}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <line x1="1" y1="1" x2="15" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="15" y1="1" x2="1" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav className={styles.nav} aria-label="Primary">
            {items.map((item) => (
              <a key={item.label} href={item.href} className={styles.link} onClick={handleClose}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className={styles.overlayFooter}>
            <LanguageMenu triggerClassName={styles.footerTrigger} openUpward align="center" />
          </div>
        </div>
      )}
    </>
  );
}
