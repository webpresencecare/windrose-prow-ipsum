# Windrose Prow for Ipsum

A thin child theme of **Ipsum** (WordPress 7.2's default theme) for the Windrose Suite. It keeps Ipsum's templates, parts, patterns and fonts and adds **style variations**. Until 0.2.0 its name was Windrose Prow (folder `windrose-prow`); other parents have their own Windrose Prow theme.

- Requires WordPress 7.2 and PHP 8.4. Works on single sites and networks, with or without the other Windrose components.
- No PHP and no `theme.json` of its own (Ipsum's applies): `style.css` and `styles/*.json`.
- Public variations only. Brand variations for one owner's sites are not in this repository: they come with Windrose Livery (kept in each site's database).

## Style variations

Each variation is a file in `styles/`. It sets Ipsum's six colours by role, so content and patterns made for Ipsum keep their meaning:

| Slug | Ipsum's name and role | Open Sea |
|---|---|---|
| `base` | Base: page background | Foam `#f6f9fb` |
| `contrast` | Contrast: text, links, buttons | Deep water `#12263a` (14.6 on Foam) |
| `accent-1` | Accent (free for content) | Teal `#0b6e78` (5.7 on Foam) |
| `accent-3` | Strong Contrast: strong ink (hover, overlay) | Night sea `#0a2540` |
| `accent-5` | Surface: soft backgrounds | Mist `#e3eef3` |
| `accent-6` | Border: lines (20 %) | `#12263a33` |

These are Twenty Twenty-Five's slugs too: Ipsum took them in core r65224 (2026-11-03, WordPress 7.2-beta4); before, `theme-1` to `theme-6`. Prow 0.2.0 follows. A Windrose Prow theme on a parent with other colour names (Metis: `theme-1` to `theme-12`) maps them.

Fonts: Archivo (headings, 600) and Inter (text), both Ipsum's. Buttons: Night sea, Teal on hover, 6 px corners.

What a variation can hold: anything `theme.json` holds (colours, gradients, duotone, fonts, sizes, spacing, widths, shadows, borders, element and block styles, custom CSS). Not templates, parts, patterns or code. A variation that brings its own font files needs them in the theme; a child's `fontFamilies` list replaces Ipsum's (it does not add to it), so such a theme lists Ipsum's fonts again.

Choosing a variation copies its values into the site's saved styles (`wp_global_styles`): a change to a variation file reaches a site only when the variation is chosen again.

To add a variation: a new `styles/<name>.json` (same palette slugs), then a release.

## Development

- Tests: Playwright (`tests/e2e/prow.spec.mjs`) on a WordPress network with WP-CLI, Ipsum and this theme installed (environment variable `WINDROSE_E2E_HOST`, the network's host, default `localhost`), on a throwaway site `/prow-e2e/`, deleted at the end: the variation is listed, applied in the Site Editor, colours and fonts checked on the front end, no request to another host, axe (WCAG 2.2 AA), Arabic right to left. Set `PROW_SCREENSHOT=<path>` to save the 1200 × 900 screenshot.
- CI (`.github/workflows/ci.yml`): variations against core's theme.json schema, theme header, zip build. Release (`release.yml`): tag `vX.Y.Z` builds `windrose-prow-ipsum.zip` (`bin/build-zip.sh`).
