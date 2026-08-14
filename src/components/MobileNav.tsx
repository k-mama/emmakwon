"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
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
    setExpandedItem(null);
    triggerRef.current?.focus();
  };

  const toggleItem = (label: string) => {
    setExpandedItem((current) => (current === label ? null : label));
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
            {items.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const expanded = expandedItem === item.label;
              const submenuId = `mobile-submenu-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

              return (
                <div key={item.label} className={styles.navGroup}>
                  <div className={styles.primaryRow}>
                    <Link href={item.href} className={styles.link} onClick={handleClose}>
                      {item.label}
                    </Link>
                    {hasChildren ? (
                      <button
                        type="button"
                        className={`${styles.expandBtn} ${expanded ? styles.expandBtnOpen : ""}`}
                        aria-label={`${expanded ? "Close" : "Open"} ${item.label} submenu`}
                        aria-expanded={expanded}
                        aria-controls={submenuId}
                        onClick={() => toggleItem(item.label)}
                      >
                        <span aria-hidden="true" className={styles.expandMark} />
                      </button>
                    ) : null}
                  </div>

                  {hasChildren && expanded ? (
                    <div id={submenuId} className={styles.submenu}>
                      {item.children?.map((child) => (
                        <Link
                          key={`${item.label}-${child.label}`}
                          href={child.href}
                          className={styles.submenuLink}
                          onClick={handleClose}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className={styles.overlayFooter}>
            <LanguageMenu triggerClassName={styles.footerTrigger} openUpward align="center" />
          </div>
        </div>
      )}
    </>
  );
}
