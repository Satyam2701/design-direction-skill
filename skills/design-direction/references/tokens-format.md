# tokens.json format

Read this before writing `design-direction-<slug>/tokens.json` in Phase 2.

## Shape

```json
{
  "meta": { "accentAsText": false, "copy": { "primaryAction": "Begin session" } },
  "color": {
    "primary": { "$type": "color", "$value": "#55705A", "$description": "Main actions, focus rings",
                 "$extensions": { "design-direction": { "dark": "#9DB59F" } } }
  },
  "font": {
    "heading": { "$type": "fontFamily", "$value": ["Fraunces", "Georgia", "serif"] },
    "body":    { "$type": "fontFamily", "$value": ["Inter", "system-ui", "sans-serif"] }
  },
  "typography": {
    "h1": { "$type": "typography", "$value": { "fontFamily": "{font.heading}", "fontSize": "48px",
            "fontWeight": 300, "lineHeight": 1.15, "letterSpacing": "-0.01em" } }
  },
  "spacing": { "1": { "$type": "dimension", "$value": "4px" } },
  "radius":  { "sm": { "$type": "dimension", "$value": "8px" } },
  "shadow":  { "card": { "$type": "shadow", "$value": "0 2px 8px rgba(0,0,0,0.06)" } }
}
```

- `color` needs all 14 roles from the Color Palette table in SKILL.md, as kebab-case keys (`primary`,
  `on-primary`, `secondary`, `accent`, `background`, `surface`, `neutral-100`, `neutral-300`,
  `neutral-600`, `neutral-900`, `success`, `warning`, `error`, `info`). Each needs a light
  `$value` and a dark value, both `#RRGGBB`. `$description` is optional; it becomes the Usage column.
- `typography` needs `h1`, `h2`, `h3`, `body`, `caption` and `label`. Use fonts available on
  Google Fonts, and always end each font stack with a generic fallback.
- List radius tokens smallest first. The first is used for buttons and inputs, the second for cards.
- `meta.name`, `meta.toneWords` and `meta.manifesto` are filled in from `direction.json`
  automatically; only set them if there is no `direction.json`.
- Set `meta.accentAsText` to `true` if Accent is ever used for text.
- Add `meta.copy` so the board's components speak in the product's voice, not placeholder text. Keys (all
  optional): `h1`, `h2`, `h3`, `body`, `caption`, `label`, `primaryAction`, `secondaryAction`,
  `tertiaryAction`, `tag`, `success`, `warning`, `error`, `info`. Write them as real UI copy for this
  product, e.g. `"primaryAction": "Send invoice"`, `"success": "Paid and reconciled."`.

## If Node isn't available

If Node isn't available (`node` is missing or the script can't run), the board and token files can't
be generated. Say so briefly, still write `direction.json` and `tokens.json` (they're the saved
direction), and produce the spec tables yourself following the Contrast Check rules in SKILL.md
Phase 2, with ratios labeled "approximate". If you can write files, hand-write `tokens.css` into the
same folder.
