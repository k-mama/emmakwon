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

// Keep the globe as a permanent part of the Emma Kwon header, while only
// exposing locales that actually exist. Future language metadata can remain
// ready in content/languages.ts without turning the public UI into a roadmap.
export default function LanguageMenu({ triggerClassName, openUpward, align = "right" }: LanguageMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const availableLanguages = languages.filter((language) => language.code === defaultLanguageCode);

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
        aria-label="Language — English"
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
          aria-label="Current language"
        >
          {availableLanguages.map((language) => (
            <button
              key={language.code}
              type="button"
              ref={activeOptionRef}
              role="menuitemradio"
              aria-checked="true"
              className={`${styles.option} ${styles.optionActive}`}
              onClick={() => closeMenu(true)}
            >
              <span>{language.label}</span>
              <span className={styles.check} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
