"use client";

import { useEffect, useId, useRef, useState } from "react";
import { languages, defaultLanguageCode } from "@/content/languages";
import VisualGlobeIcon from "./VisualGlobeIcon";
import styles from "./LanguageMenu.module.css";

type LanguageMenuProps = {
  triggerClassName?: string;
  /** Open the panel above the trigger instead of below (for footer/bottom placements). */
  openUpward?: boolean;
  /** Anchor the panel to the trigger's center instead of its right edge. */
  align?: "right" | "center";
};

// English is the only live locale today. Keep the future locale list visible
// without pretending that selecting an unreleased language translates the page.
export default function LanguageMenu({ triggerClassName, openUpward, align = "right" }: LanguageMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => activeOptionRef.current?.focus());

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      className={styles.root}
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu();
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        className={[triggerClassName, styles.trigger].filter(Boolean).join(" ")}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Change language"
        onClick={() => setOpen((value) => !value)}
      >
        <VisualGlobeIcon />
      </button>

      {open && (
        <div
          id={panelId}
          className={[styles.panel, openUpward ? styles.panelUp : "", align === "center" ? styles.panelCenter : ""]
            .filter(Boolean)
            .join(" ")}
          role="menu"
          aria-label="Select a language"
        >
          {languages.map((language) => {
            const isActive = language.code === defaultLanguageCode;
            const isAvailable = language.code === defaultLanguageCode;

            return (
              <button
                key={language.code}
                type="button"
                ref={isActive ? activeOptionRef : undefined}
                role="menuitemradio"
                aria-checked={isActive}
                aria-disabled={!isAvailable}
                disabled={!isAvailable}
                className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
                onClick={() => closeMenu(true)}
              >
                <span>{language.label}</span>
                {isAvailable ? (
                  <span className={styles.check} aria-hidden="true" />
                ) : (
                  <span className={styles.optionStatus} aria-hidden="true">
                    SOON
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
