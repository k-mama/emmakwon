"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NavItem } from "@/content/navigation";
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
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const restoreTrigger = () => {
      setOpen(false);
      setExpandedItem(null);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreTrigger();
        return;
      }

      if (event.key !== "Tab" || !overlayRef.current) return;

      const focusable = Array.from(
        overlayRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
    requestAnimationFrame(() => triggerRef.current?.focus());
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
        <div
          ref={overlayRef}
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div className={styles.overlayHeader}>
            <Link href="/" className={styles.brand} onClick={handleClose}>
              Emma Kwon
            </Link>

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
        </div>
      )}
    </>
  );
}
