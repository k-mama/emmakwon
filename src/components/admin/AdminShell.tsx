import Link from "next/link";
import styles from "./AdminShell.module.css";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/admin/" className={styles.wordmark}>
          Studio Admin
        </Link>
        <nav className={styles.nav} aria-label="Admin">
          <Link href="/admin/" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/admin/posts/" className={styles.navLink}>
            Posts
          </Link>
          <Link href="/admin/posts/new/" className={styles.navLink}>
            New Post
          </Link>
        </nav>
        <Link href="/" className={styles.viewSite}>
          View public site <span aria-hidden="true">→</span>
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
