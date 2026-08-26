# Publication Data

This directory is the public website's structured content source.

## Shape

- `publications.json` — structured publications plus lossless legacy citation overrides
- `members.json` — stable lab-member IDs, aliases, categories, and highlight policy
- `news.json` — homepage and archive news records

Structured migrations keep the exact imported `citationOverride` for audit.
`useStructuredCitation` selects generated output without deleting that source
text; disable it only when a record requires manual formatting.

Keep publications newest-first. `publicationDate` accepts `YYYY`, `YYYY-MM`, or
`YYYY-MM-DD`. `addedDate` is immutable. Sorting fills only missing publication
date components from `addedDate`; equal effective dates retain JSON order.
Legacy `addedDate` values descend daily from `2026-08-26` following the original
source-site order, avoiding a separate migration-order field.
