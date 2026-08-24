"use client";

import type { ReactNode } from "react";

/**
 * Cloudflare Access is the sole authentication boundary for Studio Admin.
 *
 * `/admin/*` and `/api/admin/*` are protected at the Cloudflare edge before
 * this client bundle is served. Do not add a client-visible passphrase here:
 * `NEXT_PUBLIC_*` values are shipped to the browser and are not authentication.
 *
 * Keeping this component as a pass-through preserves the existing Admin page
 * structure while allowing a successful Cloudflare email verification to open
 * Studio Admin immediately.
 *
 * QA branch note: this comment exists only to exercise the full pull-request CI
 * against the email-only Admin authentication build before production release.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
