import { footer } from "@/content/home";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.inner}>
          <span className={styles.brand}>{footer.brand}</span>
          <span className={styles.year}>© {footer.year}</span>
        </div>
      </div>
    </footer>
  );
}
