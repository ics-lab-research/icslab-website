# ICSLab Website

Static website for the Key Laboratory of Intelligent Communication Systems at
Phenikaa University. The site uses plain HTML, CSS, and JavaScript so GitHub
Pages can publish it directly without a build step.

## Preview

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

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
- Publication page structure: `publications.html`
- Domestic publication placeholder: `domestic-publications.html`
- Design: `styles.css`
- Mobile navigation: `script.js`
- Publication rendering: `publications.js`
- Images: `assets/`
