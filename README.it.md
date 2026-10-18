# Sito web di Termdock

[English](README.md) · **Italiano**

Il sito di [Termdock](https://github.com/LuuckA21/termdock), il terminale e gestore di connessioni SSH per Windows, macOS e Linux.

Statico e senza dipendenze: HTML, CSS e JavaScript puri in [`site/`](site), nessuna fase di build e nessun backend. Viene pubblicato su GitHub Pages da [`.github/workflows/pages.yml`](.github/workflows/pages.yml) a ogni push su `main`.

## Cosa c'è nella pagina

- Una replica interattiva dell'app: clicca i preferiti per aprire schede, scrivi `user@host:port` nella connessione rapida, scrivi `help` nel terminale quando una sessione è inattiva, oppure premi `Ctrl+Shift+P` per scrivere uno snippet.
- Le combinazioni di colori del terminale (le stesse dell'app), che cambiano la demo in tempo reale.
- L'elenco delle scorciatoie da tastiera, che si illumina quando premi la combinazione.
- Pulsanti di download per il sistema del visitatore, collegati ai file dell'ultima release su GitHub.
- Inglese e italiano, tema scuro e chiaro (di default seguono il browser e vengono ricordati una volta scelti).

## Struttura

```
site/
  index.html   contenuto della pagina (qui c'è il testo inglese)
  i18n.js      traduzioni italiane e testi costruiti a runtime
  theme.js     sceglie tema e lingua prima del primo disegno
  main.js      interazioni, API di GitHub, demo del terminale
  styles.css   tutti gli stili
  fonts/       Geist e JetBrains Mono (SIL Open Font License), ospitati in locale
  assets/      icona e screenshot dal repository di Termdock
scripts/check.mjs  controlli statici eseguiti in CI
```

## Avvio in locale

Va bene qualsiasi server statico, per esempio:

```sh
cd site && python3 -m http.server 8000
# apri http://localhost:8000
```

Prima del push esegui `node scripts/check.mjs` (Node.js 22+): verifica che gli script siano validi, che ogni testo abbia la traduzione italiana e che i file referenziati esistano.

## Modifiche

- **Testi**: cambia il testo inglese in `index.html` e quello italiano con la stessa chiave `data-i18n` in `i18n.js`. Un testo con markup (`<kbd>`, `<code>`) mantiene lo stesso markup in entrambe le lingue.
- **Nuovi testi**: dai all'elemento un nuovo `data-i18n="sezione.chiave"` e aggiungi la chiave a `i18n.js`; `check.mjs` fallisce se una chiave manca o non è usata.
- **Versione e download** arrivano a runtime dall'API di GitHub (`releases/latest`), quindi una nuova release di Termdock non richiede modifiche qui. La versione scritta nell'HTML serve solo quando l'API non è raggiungibile (limite di richieste, offline); i pulsanti allora puntano alla pagina delle release.
- **Screenshot e icona** sono copie di `docs/screenshot.png` e `assets/icon.svg` del repository di Termdock.

## Privacy e sicurezza

- Nessun cookie, nessuna statistica, nessun font o script di terze parti. L'unica richiesta esterna è verso `api.github.com` per l'ultima release e il numero di stelle (in cache per 10 minuti nella sessione).
- Una Content-Security-Policy rigorosa (`script-src 'self'`, `style-src 'self'`, `connect-src https://api.github.com`) vieta script inline e attributi `style` inline; gli stili dinamici passano dal CSSOM.
- Le preferenze (lingua, tema, schema del terminale) restano solo nel `localStorage` del browser.
- Le action dei workflow sono fissate a commit SHA.

## Pubblicazione

Configurazione una tantum: *Settings → Pages → Build and deployment → Source: GitHub Actions*. Il sito è poi servito su `https://luucka21.github.io/termdock-site/`. Con un dominio personalizzato, aggiorna gli URL `canonical` e `og:` in `index.html`.

## Licenza

Codice con [licenza MIT](LICENSE). Font con SIL Open Font License 1.1 (`site/fonts/LICENSE-*.txt`).
