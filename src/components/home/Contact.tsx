import { contact } from "@/content/home";
import styles from "./Contact.module.css";

function externalProps(href: string) {
  return href.startsWith("http")
    ? { target: "_blank", rel: "noreferrer" }
    : {};
}

export default function Contact() {
  return (
    <section id="contact" className={styles.section} aria-labelledby="contact-heading">
      <div className="container">
        <div className={styles.panel}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{contact.eyebrow}</p>
            <h2 id="contact-heading" className={styles.headline}>
              {contact.headline}
            </h2>
          </div>

          <div className={styles.actionColumn}>
            <p className={styles.supporting}>{contact.supporting}</p>

            <a
              href={contact.cta.href}
              className={styles.cta}
              {...externalProps(contact.cta.href)}
            >
              {contact.cta.label}
              <span className={styles.ctaArrow} aria-hidden="true">
                ↗
              </span>
            </a>
          </div>

          <div className={styles.methods} aria-label="Emma Kwon channels">
            {contact.methods.map((method, index) => (
              <a
                key={method.label}
                href={method.href}
                className={styles.method}
                {...externalProps(method.href)}
              >
                <span className={styles.methodNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{method.label}</span>
                <span className={styles.methodArrow} aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
