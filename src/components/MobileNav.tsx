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
        <span className={styles.triggerLines} aria-hidden="true">
          <span className={styles.triggerLineTop} />
          <span className={styles.triggerLineBottom} />
        </span>
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
              <span className={styles.closeLines} aria-hidden="true">
                <span className={styles.closeLineA} />
                <span className={styles.closeLineB} />
              </span>
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
