# Project 42 Brand Assets

Project 42 uses a compact geometric `42` mark. The four rises like a learning path;
the two returns like an evidence-and-improvement loop. The shapes deliberately avoid
provider logos, robot/brain imagery, and other vendor-specific AI shorthand.

## Source and licensing

The production geometry is authored as editable SVG in this directory. A generated
concept was used as an internal ideation reference, but no generated bitmap or
third-party stock artwork ships in the product. No external font files are embedded.

The SVG sources and generated exports are reusable under CC BY 4.0 with the rest of
the Project 42 curriculum and brand documentation. The generation script is
Apache-2.0 with the application code.

## Files

| File | Use |
|---|---|
| `project-42-mark.svg` | Full-color transparent mark |
| `project-42-mark-mono.svg` | One-color light-background treatment |
| `project-42-mark-reversed.svg` | One-color dark-background treatment |
| `project-42-app-icon.svg` | Master for favicon, bookmark, Apple, and web-app exports |
| `project-42-maskable-icon.svg` | Full-bleed safe-zone master for maskable web-app export |
| `project-42-wordmark.svg` | Horizontal mark and name |
| `project-42-social.svg` | Editable social-preview master |
| `asset-manifest.json` | Source and generated-file integrity record |

Run `npm run brand:generate` after changing either raster master. CI runs
`npm run brand:check` to verify source hashes, image dimensions, file integrity, and
the multi-size ICO directory.

SVG sources are canonicalized to UTF-8 without a byte-order mark and with LF
line endings before hashing and raster generation. This keeps the integrity
manifest stable across normal Windows and Linux Git checkouts without ignoring
substantive SVG changes.

## Usage

- Keep clear space around the mark equal to at least one quarter of its height.
- Use the compact mark at 16 pixels or larger and the horizontal wordmark at
  120 pixels or larger.
- Do not recolor individual shapes outside the documented navy, lime, cyan, paper,
  monochrome, or reversed treatments.
- The mark is decorative when the adjacent readable `Project 42` name is present.
  Use an accessible name such as `Project 42` when it appears alone.
- The inline site mark maps to system colors in forced-colors mode.

## Self-host replacement

Downstream operators may replace Project 42 branding without changing learning
content:

1. Replace the six SVG sources while preserving their filenames and view boxes.
2. Update the accessible application name and social text in `app/layout.tsx`,
   `app/manifest.ts`, and the shared header/footer.
3. Run `npm run brand:generate`.
4. Run `npm run check` and verify the header, favicon, Apple icon, manifest icons,
   social preview, and forced-colors treatment.

Private PMO assets are not required to build or replace this brand.
