# Deploying

Live site: https://jeeper31.github.io/reading-conquest/ (GitHub Pages, branch `gh-pages`, root).

    npm run deploy

rebuilds `dist/` (Vite base `/reading-conquest/`) and pushes it to the `gh-pages` branch with a `.nojekyll` file.
Requires git push access to the repo (e.g. `gh auth login` + `gh auth setup-git`).

`deploy.yml.example` is a GitHub Actions alternative. To use it, move it to `.github/workflows/deploy.yml`
(pushing it needs a token with the `workflow` scope) and switch Pages' source to "GitHub Actions".
