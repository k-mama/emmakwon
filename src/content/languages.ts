// Future multilingual readiness.
//
// The site currently renders only in English — no translations exist yet.
// This list drives the language selector UI (the multicolor globe icon) so
// the affordance is in place before the content is. When real translations
// are added later, each `code` here is the natural key for a locale route
// or a translation dictionary.
//
// Brand and proper nouns — EMMAESTRO, SLY FAIRY, K-MAMA, BORN RARE, Amazing
// Tiger Publishing, and "Emma Kwon" — should stay unchanged across every
// locale added later. Translate the sentences around them, not the names.

export type Language = {
  code: string;
  label: string;
};

export const languages: Language[] = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "zh-Hant", label: "繁體中文" },
  { code: "zh-Hans", label: "简体中文" },
  { code: "es", label: "Español" },
  { code: "pt-BR", label: "Português (Brasil)" },
];

export const defaultLanguageCode = "en";
