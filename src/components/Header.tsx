import Link from "next/link";
import { primaryNav } from "@/content/navigation";
import LanguageMenu from "./LanguageMenu";
import MobileNav from "./MobileNav";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Emma Kwon
        </Link>

        <MobileNav items={primaryNav} />

        <nav className={styles.nav} aria-label="Primary">
          {primaryNav.map((item) => (
            <a key={item.label} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
          <LanguageMenu triggerClassName={styles.iconBtn} />
        </nav>
      </div>
    </header>
  );
}
