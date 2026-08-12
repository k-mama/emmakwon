"use client";

import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/content/navigation";
import styles from "./WorkMenu.module.css";

type WorkMenuProps = {
  item: NavItem;
  triggerClassName?: string;
};

export default function WorkMenu({ item, triggerClassName }: WorkMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const children = item.children ?? [];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={[triggerClassName, styles.trigger].filter(Boolean).join(" ")}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {item.label}
        <span className={styles.caret} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          {children.map((child) => (
            <a
              key={child.label}
              href={child.href}
              role="menuitem"
              className={styles.panelLink}
              onClick={() => setOpen(false)}
            >
              {child.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
