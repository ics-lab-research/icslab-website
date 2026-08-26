# Local Content Editor

Dependency-free localhost application for editing publication, member, and news
JSON files.

## Files

- `server.py` — localhost server, validation, and atomic writes
- `index.html` — editor structure
- `editor.css` — editor presentation
- `editor.js` — forms, previews, and save behavior
- `test_server.py` — validation and atomic-write checks

DOI import preserves available year/month/day precision. Publication saves fill
missing date components from immutable `addedDate`, then sort newest-first.

## Run

```bash
uv run editor
```

Open `http://127.0.0.1:8001/editor/`.
