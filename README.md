# ICSLab Website

Static website for the Key Laboratory of Intelligent Communication Systems at
Phenikaa University. The site uses plain HTML, CSS, and JavaScript so GitHub
Pages can publish it directly without a build step.

## Preview

```bash
uv run web
```

Open <http://localhost:8000>.

## Local content editor

The editor has no account or sign-in. It binds only to `127.0.0.1` and writes
validated JSON directly to this repository.

```bash
uv run editor
```

Open <http://127.0.0.1:8001/editor/>. Review `git diff` before pushing changes.
Never expose the editor port to a network or deploy it as a public service.

For publications, paste a DOI and select **Get metadata**. The editor imports
bibliographic fields and all available publication-date precision. Sorting uses
the DOI year/month/day, filling missing components from the immutable added date.
If retrieval fails, all
fields remain available for manual entry. Add Q, impact factor, ranking year,
ranking source, and Scopus manually because DOI metadata does not reliably
provide journal rankings.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.

The temporary site URL is:

```text
https://ics-lab-research.github.io/icslab-website/
```

No `CNAME` file is included, so `icslab.phenikaa-uni.edu.vn` continues serving
the old Google Sites website. When the new site is approved, add the custom
domain in GitHub **Settings → Pages**, then update DNS.

## Content updates

- Main content: `index.html`
- International publications: `data/publications.json`
- Lab author registry: `data/members.json`
- News: `data/news.json`
- Publication page structure: `publications.html`
- News page structure: `news.html`
- Domestic publication placeholder: `domestic-publications.html`
- Conference watchlist: `conferences.html`
- Design: `styles/styles.css`
- Mobile navigation: `scripts/script.js`
- Publication rendering: `scripts/publications.js`
- Shared citation formatting: `scripts/content-format.js`
- News rendering: `scripts/news.js`
- Local editor: `tools/content-editor/`
- Images: `assets/`
