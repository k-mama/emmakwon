import { footer } from "@/content/home";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.inner}>
          <span className={styles.brand}>
            © {footer.year} {footer.brand}
          </span>
          <a href={footer.contact.href} className={styles.link}>
            {footer.contact.label}
          </a>
        </div>
      </div>
    </footer>
  );
}
