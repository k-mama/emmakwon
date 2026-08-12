"use client";

import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/content/navigation";
import styles from "./HouseMenu.module.css";

type HouseMenuProps = {
  item: NavItem;
  triggerClassName?: string;
};

export default function HouseMenu({ item, triggerClassName }: HouseMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const groups = item.groups ?? [];

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
          {groups.map((group) => (
            <div key={group.label} className={styles.column}>
              <p className={styles.columnLabel}>{group.label}</p>
              <div className={styles.columnLinks}>
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    role="menuitem"
                    className={styles.columnLink}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
