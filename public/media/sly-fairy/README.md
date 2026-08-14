# SLY FAIRY cinematic media handoff

This folder is reserved for approved Sly Fairy story-world media used by `/sly-fairy/`.

Do not place strategy boards, character-bible layouts, album-cover art, or generic fairy imagery here.
Only final or near-final cinematic stills/video that match the current canon should be wired into the page.

## Canon locks

- 100M / happiness quota / mission-counter storytelling is retired.
- Sly is a celestial intermediary, not a goddess or chosen-one figure.
- Her defining reflex is noticing what is needed before anyone asks.
- Core dramatic question: `Can you touch a life without taking it over?`
- Water is `Memory & Transfer` and follows `TO REMEMBER WITHOUT POSSESSING`.
- Water carries fragments/residue, never a complete live view of another person's life.
- Sly may misread what residue means.
- The public page should feel cinematic and editorial, never like a lore encyclopedia or fantasy-game UI.

## Asset 01 — Waterworks

Preferred filename:

`waterworks.webp`

Optional motion version:

`waterworks.mp4`
`waterworks-poster.webp`

Target:

- 16:9 master, minimum 1920x1080
- no text, UI, title treatment, watermark, border, or infographic
- sophisticated global-streaming-drama frame
- enormous suspended-water architecture: living archive + hydraulic system, not a royal palace
- Sly in celestial fox-fairy form, adult and elegant
- pearl-white fur, long translucent ears, amber-gold eyes
- champagne-gold filigree details
- blush-pink luminous ribbon tails
- no default ceremonial crown
- she is working: diagnosing or correcting a reversed current / junction
- Water residue appears only as incomplete traces: wet cloth, rain, a laugh fragment, a badly sung note, vibration, reflected light
- never show full human memories or CCTV-like live scenes
- visual emphasis: competence first, wonder second

Suggested public alt text:

`Sly Fairy working among the suspended currents of the Waterworks.`

## Asset 02 — Earth / Borrowed Body

Preferred filename:

`earth.webp`

Optional motion version:

`earth.mp4`
`earth-poster.webp`

Target:

- 16:9 master, minimum 1920x1080
- no text, UI, watermark, border, or infographic
- contemporary North American reality with one impossible person inside it
- Sly in bounded human form; final face must match the approved human-form reference before publication
- lived-in Lowwater setting, not generic fantasy city
- laundromat / street / small working room are preferred first-world locations
- show practical human texture: machines, work, clothes, money, fatigue, imperfect light
- no magic spectacle solving the scene
- visual emphasis: `close enough to be wrong`
- she should look curious, observant, slightly over-ready to help

Suggested public alt text:

`Sly Fairy in her borrowed human body inside everyday Lowwater life.`

## Wiring rule

Until approved files exist, keep `cinematicMedia.*.kind = "atmosphere"` and `src = null` in `src/content/sly-fairy.ts`.

When an approved still is added:

- set `kind` to `"image"`
- set `src` to `/media/sly-fairy/waterworks.webp` or `/media/sly-fairy/earth.webp`
- add the matching alt text

When an approved motion asset is added:

- set `kind` to `"video"`
- set `src` to the `.mp4`
- set `poster` to the matching poster `.webp`
- preserve the existing reduced-motion behavior

Do not wire a file merely because it is visually attractive. It must first pass character consistency, current canon, Water privacy rules, and the Bright Luxury cinematic direction.
