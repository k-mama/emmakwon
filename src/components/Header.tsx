import Link from "next/link";
import { primaryNav } from "@/content/navigation";
import VisualGlobeIcon from "./VisualGlobeIcon";
import WorkMenu from "./WorkMenu";
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
          {primaryNav.map((item) =>
            item.children ? (
              <WorkMenu key={item.label} item={item} triggerClassName={styles.navLink} />
            ) : (
              <a key={item.label} href={item.href} className={styles.navLink}>
                {item.label}
              </a>
            )
          )}
          <button type="button" className={styles.iconBtn} aria-label="Change language">
            <VisualGlobeIcon />
          </button>
        </nav>
      </div>
    </header>
  );
}
