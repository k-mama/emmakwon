import Link from "next/link";
import { footer } from "@/content/home";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} aria-label="Return to Emma Kwon home">
            {footer.brand}
          </Link>
          <span className={styles.year}>© {footer.year}</span>
        </div>
      </div>
    </footer>
  );
}
