import { contact } from "@/content/home";
import styles from "./Contact.module.css";

export default function Contact() {
  return (
    <section id="contact" className={styles.section} aria-labelledby="contact-heading">
      <div className="container">
        <div className={styles.panel}>
          <h2 id="contact-heading" className={styles.headline}>
            {contact.headline}
          </h2>
          <p className={styles.supporting}>{contact.supporting}</p>

          <a href={contact.cta.href} className={styles.cta}>
            {contact.cta.label}
            <span className={styles.ctaArrow} aria-hidden="true">
              →
            </span>
          </a>

          <div className={styles.methods}>
            {contact.methods.map((method) => (
              <a key={method.label} href={method.href} className={styles.method}>
                {method.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
