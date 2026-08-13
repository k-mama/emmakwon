"use client";

// This gate is a UX-level deterrent, not real security. This site is a
// static export — anything shipped to the client (including
// NEXT_PUBLIC_ADMIN_PASSPHRASE) is visible in the browser bundle to
// anyone who looks, so this check can be bypassed by reading the source.
// The real security boundary for /admin must be enforced at the edge —
// e.g. Cloudflare Access gating the /admin/* path to Emma's own login —
// configured in the Cloudflare dashboard, outside this codebase. See the
// Phase 2 report for exact setup steps. This gate exists only so /admin
// isn't trivially usable by a casual visitor before that's configured.
import { useState, useSyncExternalStore, type FormEvent } from "react";
import styles from "./AdminGate.module.css";

const SESSION_KEY = "emmakwon-admin-session";
const PASSPHRASE = process.env.NEXT_PUBLIC_ADMIN_PASSPHRASE;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return window.sessionStorage.getItem(SESSION_KEY) === "1";
}

function getServerSnapshot(): boolean {
  return false;
}

function unlock(): void {
  window.sessionStorage.setItem(SESSION_KEY, "1");
  listeners.forEach((listener) => listener());
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const unlocked = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  if (!PASSPHRASE) {
    return (
      <div className={styles.screen}>
        <div className={styles.panel}>
          <p className={styles.eyebrow}>Admin locked</p>
          <h1 className={styles.headline}>No passphrase configured</h1>
          <p className={styles.body}>
            Set <code>NEXT_PUBLIC_ADMIN_PASSPHRASE</code> in the deployment environment to enable this gate. Until
            then, /admin refuses to open.
          </p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    const handleSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (input === PASSPHRASE) {
        unlock();
        setError(false);
      } else {
        setError(true);
      }
    };

    return (
      <div className={styles.screen}>
        <form className={styles.panel} onSubmit={handleSubmit}>
          <p className={styles.eyebrow}>Studio Admin</p>
          <h1 className={styles.headline}>Enter passphrase</h1>
          <input
            type="password"
            className={styles.input}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError(false);
            }}
            autoFocus
          />
          {error && <p className={styles.error}>That&rsquo;s not it — try again.</p>}
          <button type="submit" className={styles.submit}>
            Enter
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
