# Termdock website: notes for contributors and agents

Static website of [Termdock](https://github.com/LuuckA21/termdock): plain HTML,
CSS and JavaScript in `site/`, no build step, no backend, no dependencies.
Published to GitHub Pages by `.github/workflows/pages.yml` on every push to
`main`. See README.md for the structure.

## Workflow

- **Every change gets its own new branch**, created from an up-to-date `main`
  (`git fetch origin main && git checkout -b <topic> origin/main`), with a
  short descriptive name such as `site/update-0.14.0` or `docs/faq-wording`.
  Never reuse a branch whose PR is already merged.
- `main` is protected: never push to it directly. Open a pull request from the
  branch; CI (`check` job) must be green. Merge (squash) only when the owner
  asks for it.
- Before pushing run `node scripts/check.mjs` (Node.js 22+): it parses the
  scripts, checks translations and referenced files, and rejects inline
  scripts or `style` attributes.
- Visual changes are checked in a real browser (headless Chromium is fine) in
  dark and light theme, at desktop and phone width (390 px): no console
  errors, no horizontal overflow.

## Languages

- Code, comments, commit messages and PR descriptions are in English.
- The page is bilingual: English text lives in `site/index.html`, the Italian
  text under the same `data-i18n` key in `site/i18n.js`; strings built at
  runtime are in `TD_I18N.runtime` (both languages). Every key in both.
- `README.md` / `README.it.md` are a pair: update both in the same PR.

## Constraints

- The Content-Security-Policy in `index.html` allows only same-origin scripts
  and styles and `connect-src https://api.github.com`: no inline scripts, no
  `style="…"` attributes (set dynamic styles through the CSSOM), no external
  fonts, scripts or analytics.
- Workflow actions stay pinned to commit SHAs.
- Fonts are self-hosted under the SIL Open Font License; keep their licence
  files next to them.

## Updating for a new Termdock release

Version and download links come from the GitHub API at runtime, so a release
needs a site change only when it brings something worth describing. Read the
release's section in Termdock's `CHANGELOG.md` and **always check Termdock's
`FEATURES.md` and `FEATURES.it.md`** (the ranked list of every feature): each
entry there must be on the page, in English and Italian, and the Italian page
should use the same wording as `FEATURES.it.md` where it fits. Then update as
needed:

- the fallback version (`#news-version`, `#hero-version`, `#dl-version`) and
  the news pill text (`hero.news`);
- feature, security, shortcut, download or FAQ texts that the release changes
  (English and Italian);
- the local shell's `git log` in the demo (`SCRIPTS.local` in `main.js`).

Describe only what the changelog and README of Termdock state; do not invent
features or numbers.
