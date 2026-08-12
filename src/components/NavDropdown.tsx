import type { NavItem } from "@/content/navigation";
import styles from "./NavDropdown.module.css";

type NavDropdownProps = {
  item: NavItem;
  linkClassName?: string;
};

// Server component: the dropdown opens on hover/focus via pure CSS
// (:hover / :focus-within), so no client-side JS is needed on desktop.
export default function NavDropdown({ item, linkClassName }: NavDropdownProps) {
  if (!item.links || item.links.length === 0) {
    return (
      <a href={item.href} className={linkClassName}>
        {item.label}
      </a>
    );
  }

  return (
    <div className={styles.item}>
      <a href={item.href} className={linkClassName}>
        {item.label}
      </a>

      <div className={styles.panel} role="menu">
        {item.links.map((link) => (
          <a key={link.label} href={link.href} role="menuitem" className={styles.panelLink}>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
