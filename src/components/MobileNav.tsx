"use client";

import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/content/navigation";
import VisualGlobeIcon from "./VisualGlobeIcon";
import styles from "./MobileNav.module.css";

type MobileNavProps = {
  items: NavItem[];
};

export default function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const handleOpen = () => {
    setExpanded(new Set());
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const toggleExpanded = (label: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-label="Open menu"
        aria-expanded={open}
        onClick={handleOpen}
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
            {items.map((item) => {
              const isExpandable = Boolean(item.links && item.links.length > 0);
              const isOpen = expanded.has(item.label);

              return (
                <div key={item.label} className={styles.item}>
                  <div className={styles.itemRow}>
                    <a href={item.href} className={styles.link} onClick={handleClose}>
                      {item.label}
                    </a>
                    {isExpandable && (
                      <button
                        type="button"
                        className={styles.toggle}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`}
                        onClick={() => toggleExpanded(item.label)}
                      >
                        <span className={styles.chevron} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {isExpandable && isOpen && (
                    <ul className={styles.sublist}>
                      {item.links?.map((link) => (
                        <li key={link.label}>
                          <a href={link.href} className={styles.sublink} onClick={handleClose}>
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          <div className={styles.overlayFooter}>
            <VisualGlobeIcon size={22} />
          </div>
        </div>
      )}
    </>
  );
}
