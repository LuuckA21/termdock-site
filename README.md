# Termdock website

**English** · [Italiano](README.it.md)

The website of [Termdock](https://github.com/LuuckA21/termdock), the terminal and SSH connection manager for Windows, macOS and Linux.

Static and dependency-free: plain HTML, CSS and JavaScript in [`site/`](site), no build step and no backend. It is published to GitHub Pages by [`.github/workflows/pages.yml`](.github/workflows/pages.yml) on every push to `main`.

## What's on the page

- An interactive replica of the app: click the favorites to open tabs, type `user@host:port` in quick connect, type `help` in the terminal once a session is idle.
- Terminal colour schemes (the same palettes as the app) that restyle the demo live.
- Keyboard shortcut list that lights up when the combination is pressed.
- Download buttons for the visitor's system, linked to the assets of the latest GitHub release.
- English and Italian, dark and light theme (both follow the browser by default and are remembered once chosen).

## Structure

```
site/
  index.html   page content (English text lives here)
  i18n.js      Italian translations and the strings built at runtime
  theme.js     picks theme and language before the first paint
  main.js      interactions, GitHub API, terminal demo
  styles.css   all styles
  fonts/       Geist and JetBrains Mono (SIL Open Font License), self-hosted
  assets/      icon and screenshot from the Termdock repository
scripts/check.mjs  static checks run in CI
```

## Running locally

Any static server works, for example:

```sh
cd site && python3 -m http.server 8000
# open http://localhost:8000
```

Before pushing run `node scripts/check.mjs` (Node.js 22+): it parses the scripts, checks that every text has its Italian translation and that referenced files exist.

## Editing

- **Text**: change the English text in `index.html` and the Italian one under the same `data-i18n` key in `i18n.js`. A text with markup (`<kbd>`, `<code>`) keeps the same markup in both languages.
- **New text**: give the element a new `data-i18n="section.key"` and add the key to `i18n.js`; `check.mjs` fails if a key is missing or unused.
- **Version and downloads** come from the GitHub API (`releases/latest`) at runtime, so a new Termdock release needs no change here. The version written in the HTML is only the fallback when the API is unreachable (rate limit, offline); buttons then point to the releases page.
- **Screenshot and icon** are copies of `docs/screenshot.png` and `assets/icon.svg` from the Termdock repository.

## Privacy and security

- No cookies, no analytics, no third-party fonts or scripts. The only external request is to `api.github.com` for the latest release and the star count (cached for 10 minutes in the session).
- A strict Content-Security-Policy (`script-src 'self'`, `style-src 'self'`, `connect-src https://api.github.com`) forbids inline scripts and inline `style` attributes; dynamic styles are set through the CSSOM.
- Preferences (language, theme, terminal scheme) are kept only in the browser's `localStorage`.
- Workflow actions are pinned to commit SHAs.

## Publishing

One-time setup: *Settings → Pages → Build and deployment → Source: GitHub Actions*. The site is then served at `https://luucka21.github.io/termdock-site/`. With a custom domain, update the `canonical` and `og:` URLs in `index.html`.

## License

Code under the [MIT license](LICENSE). Fonts under the SIL Open Font License 1.1 (`site/fonts/LICENSE-*.txt`).
