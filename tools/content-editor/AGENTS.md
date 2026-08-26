# Local Content Editor Instructions

- Keep the editor dependency-free and bound to `127.0.0.1`.
- Never add authentication secrets or repository tokens.
- Validate before writing and replace JSON files atomically.
- Preserve optimistic revision checks to prevent accidental overwrites.
- Keep public-site rendering logic in `scripts/content-format.js`, not duplicated here.

See `INDEX.md` for commands and file responsibilities.
