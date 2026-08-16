export type PublicExternalMediaRef = {
  label: string;
  url: string;
};

export function isSafePublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizePublicExternalMedia(
  media: readonly PublicExternalMediaRef[] | undefined,
): PublicExternalMediaRef[] | undefined {
  if (!media) return undefined;

  const safe = media
    .map((item) => ({ label: item.label.trim(), url: item.url.trim() }))
    .filter((item) => item.label && isSafePublicHttpUrl(item.url));

  return safe.length ? safe : undefined;
}
