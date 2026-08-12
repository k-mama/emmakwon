import Link from "next/link";
import styles from "./Header.module.css";

const navItems = [
  { label: "EMMAESTRO", href: "#" },
  { label: "Amazing Tiger Publishing", href: "#" },
  { label: "BORN RARE", href: "#" },
  { label: "Works", href: "#" },
  { label: "K-MAMA", href: "#" },
  { label: "Contact", href: "#" },
];

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Emma Kwon
        </Link>

        <button type="button" className={`${styles.iconBtn} ${styles.menuBtn}`} aria-label="Open menu">
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
            <line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.4" />
            <line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.4" />
            <line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        <nav className={styles.nav} aria-label="Primary">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
          <button type="button" className={styles.iconBtn} aria-label="Change language">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.1" />
              <ellipse cx="9" cy="9" rx="3.2" ry="7.5" stroke="currentColor" strokeWidth="1.1" />
              <line x1="1.5" y1="9" x2="16.5" y2="9" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
