# ICSLab Website

Static website for the Key Laboratory of Intelligent Communication Systems at
Phenikaa University. The site uses plain HTML, CSS, and JavaScript so GitHub
Pages can publish it directly without a build step.

## Preview

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Local content editor

The editor has no account or sign-in. It binds only to `127.0.0.1` and writes
validated JSON directly to this repository.

```bash
python3 tools/content-editor/server.py
```

Open <http://127.0.0.1:8001/editor/>. Review `git diff` before pushing changes.
Never expose the editor port to a network or deploy it as a public service.

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
- Design: `styles.css`
- Mobile navigation: `script.js`
- Publication rendering: `publications.js`
- Shared citation formatting: `content-format.js`
- News rendering: `news.js`
- Local editor: `tools/content-editor/`
- Images: `assets/`
