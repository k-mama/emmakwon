import { insideTheStudio } from "@/content/home";
import styles from "./InsideTheStudio.module.css";

export default function InsideTheStudio() {
  return (
    <section id="inside-the-studio" className={styles.section} aria-labelledby="studio-heading">
      <div className="container">
        <p className={styles.eyebrow}>{insideTheStudio.label}</p>
        <h2 id="studio-heading" className={styles.caseStudy}>
          {insideTheStudio.caseStudy}
        </h2>

        <ol className={styles.steps}>
          {insideTheStudio.steps.map((step, i) => (
            <li key={step.index} className={styles.step}>
              <p className={styles.stepLabel}>
                <span className={styles.stepIndex}>{step.index}</span>
                {step.label}
                {i < insideTheStudio.steps.length - 1 && (
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
                )}
              </p>

              <div className={styles.frame}>
                {step.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={step.image} alt="" className={styles.image} loading="lazy" />
                ) : (
                  <span className={styles.placeholder}>Process visual — coming soon</span>
                )}
              </div>

              <p className={styles.description}>{step.description}</p>
            </li>
          ))}
        </ol>

        <p className={styles.pullQuote}>
          <span className={styles.pullQuoteMark} aria-hidden="true" />
          {insideTheStudio.pullQuote}
        </p>
      </div>
    </section>
  );
}
