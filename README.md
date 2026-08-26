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

`CNAME` keeps the existing `icslab.phenikaa-uni.edu.vn` domain. Set its DNS
`CNAME` record to `ics-lab-research.github.io` before switching away from
Google Sites.

## Content updates

- Main content: `index.html`
- Design: `styles.css`
- Mobile navigation: `script.js`
- Images: `assets/`
